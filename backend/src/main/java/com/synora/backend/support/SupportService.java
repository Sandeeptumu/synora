package com.synora.backend.support;

import com.synora.backend.engine.RiskEngine;
import com.synora.backend.user.User;
import com.synora.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SupportService {

    private final CheckInRecordRepository checkInRepo;
    private final ConversationLogRepository conversationRepo;
    private final SupportTriageRepository triageRepo;
    private final UserRepository userRepo;
    private final RiskEngine riskEngine;

    public SupportService(CheckInRecordRepository checkInRepo,
                          ConversationLogRepository conversationRepo,
                          SupportTriageRepository triageRepo,
                          UserRepository userRepo,
                          RiskEngine riskEngine) {
        this.checkInRepo = checkInRepo;
        this.conversationRepo = conversationRepo;
        this.triageRepo = triageRepo;
        this.userRepo = userRepo;
        this.riskEngine = riskEngine;
    }

    @Transactional
    public UUID recordCheckIn(UUID userId, String mood, Integer stressLevel, Integer energyLevel,
                              Integer sleepQuality, Integer connectionLevel, String noteText) {
        User u = userRepo.findById(userId).orElseThrow(() -> new IllegalStateException("User not found"));
        // One check-in per day per user
        Instant startOfDay = LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant endOfDay = LocalDate.now().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        if (checkInRepo.countByUserIdAndDay(userId, startOfDay, endOfDay) > 0) {
            throw new IllegalArgumentException("A check-in for today already exists");
        }
        CheckInRecord r = new CheckInRecord();
        r.setUser(u);
        r.setMood(mood);
        r.setStressLevel(stressLevel);
        r.setEnergyLevel(energyLevel);
        r.setSleepQuality(sleepQuality);
        r.setConnectionLevel(connectionLevel);
        r.setNoteText(noteText);
        r.setCreatedAt(Instant.now());
        return checkInRepo.save(r).getId();
    }

    public CheckInRecord todayCheckIn(UUID userId) {
        Instant startOfDay = LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant endOfDay = LocalDate.now().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        return checkInRepo.findByUserIdAndCreatedAtAfter(userId, startOfDay).stream().findFirst().orElse(null);
    }

    public List<CheckInRecord> history(UUID userId) {
        return checkInRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public UUID addMessage(UUID userId, String kind, String text) {
        User u = userRepo.findById(userId).orElseThrow(() -> new IllegalStateException("User not found"));
        ConversationLog log = new ConversationLog();
        log.setUser(u);
        log.setKind(kind);
        log.setMessageText(text);
        log.setCreatedAt(Instant.now());
        return conversationRepo.save(log).getId();
    }

    public List<Map<String, Object>> conversationHistory(UUID userId) {
        return conversationRepo.findByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(l -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", l.getId().toString());
                    m.put("kind", l.getKind());
                    m.put("text", l.getMessageText());
                    m.put("createdAt", l.getCreatedAt().toString());
                    return m;
                })
                .toList();
    }

    @Transactional
    public void clearConversation(UUID userId) {
        User u = userRepo.findById(userId).orElseThrow(() -> new IllegalStateException("User not found"));
        conversationRepo.deleteAll(conversationRepo.findByUserIdOrderByCreatedAtAsc(userId));
    }

    /**
     * Build a support triage from check-in + recent conversation signals.
     * This is triage, not diagnosis.
     */
    @Transactional
    public SupportTriage assess(UUID userId) {
        User u = userRepo.findById(userId).orElseThrow(() -> new IllegalStateException("User not found"));
        var today = todayCheckIn(userId);
        var conv = conversationHistory(userId);
        String primaryConcern = derivePrimaryConcern(today, conv);
        List<String> areas = deriveConcernAreas(today, conv);
        String riskLevel = computeRiskLevel(today, conv);
        String suggested = suggestedSupport(riskLevel, primaryConcern);
        SupportTriage t = triageRepo.findByUserId(userId).orElseGet(() -> {
            SupportTriage nt = new SupportTriage();
            nt.setUser(u);
            return nt;
        });
        t.setPrimaryConcern(primaryConcern);
        t.setConcernAreas(areas);
        t.setRiskLevel(riskLevel);
        t.setSuggestedSupport(suggested);
        t.setMatchSummary(List.of("Assessed from recent check-in and conversation signals."));
        return triageRepo.save(t);
    }

    public Optional<SupportTriage> currentTriage(UUID userId) {
        return triageRepo.findByUserId(userId);
    }

    /**
     * Rank experts (counselors/case officers) for a user by role, active status,
     * specialisations overlap, language overlap, and a simple preference weighting.
     */
    public List<Map<String, Object>> recommendExperts(UUID userId, int limit) {
        User u = userRepo.findById(userId).orElseThrow(() -> new IllegalStateException("User not found"));
        var triage = currentTriage(userId).orElseGet(() -> assess(userId));
        List<String> userLanguages = u.getLanguageCodes();
        List<String> userConcerns = triage.getConcernAreas();
        String preferredPrimary = u.getPrimaryLanguage();

        List<User> candidates = userRepo.findAll().stream()
                .filter(expert -> expert.isActive()
                        && (expert.getRole().equals("COUNSELOR") || expert.getRole().equals("CASE_OFFICER")))
                .filter(expert -> !expert.getId().equals(userId))
                .sorted(Comparator.comparingDouble(e -> -matchScore(e, userLanguages, userConcerns, preferredPrimary, triage.getRiskLevel())))
                .toList();

        return candidates.stream().limit(limit).map(expert -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", expert.getId().toString());
            m.put("fullName", expert.getFullName());
            m.put("role", expert.getRole());
            m.put("active", expert.isActive());
            m.put("organization", expert.getOrganization());
            m.put("specialisation", expert.getSpecialisation());
            m.put("specialisations", expert.getSpecialisations());
            m.put("languages", expert.getLanguageCodes());
            m.put("primaryLanguage", expert.getPrimaryLanguage());
            m.put("matchReason", buildMatchReason(expert, userLanguages, userConcerns, preferredPrimary));
            m.put("score", (int) Math.round(matchScore(expert, userLanguages, userConcerns, preferredPrimary, triage.getRiskLevel()) * 100));
            return m;
        }).collect(Collectors.toList());
    }

    // Internal concern vocabulary (derived from application config / specialisations when available).
    private static final Set<String> CONCERN_AREA_NAMES = Set.of(
            "general_wellbeing", "stress", "anxiety_related", "low_mood", "relationship_concerns",
            "academic_stress", "workplace_stress", "financial_concerns", "family_concerns",
            "grief", "substance_related", "safeguarding", "self_harm_concern", "crisis_emergency_concern"
    );

    private List<String> deriveConcernAreas(CheckInRecord today, List<Map<String, Object>> conv) {
        Set<String> out = new LinkedHashSet<>();
        if (today != null) {
            if (today.getStressLevel() != null && today.getStressLevel() >= 7) out.add("stress");
            if (today.getMood() != null && (today.getMood().equals("very_low") || today.getMood().equals("low"))) out.add("low_mood");
            if (today.getMood() != null && (today.getMood().equals("low") || today.getMood().equals("very_low"))) out.add("general_wellbeing");
            if (today.getSleepQuality() != null && today.getSleepQuality() <= 4) out.add("general_wellbeing");
            if (today.getEnergyLevel() != null && today.getEnergyLevel() <= 4) out.add("general_wellbeing");
            if (today.getConnectionLevel() != null && today.getConnectionLevel() <= 4) out.add("general_wellbeing");
        }
        for (var m : conv) {
            String t = (String) m.get("text");
            if (t == null) continue;
            String lower = t.toLowerCase(Locale.ROOT);
            if (lower.contains("work") || lower.contains("job") || lower.contains("office")) out.add("workplace_stress");
            if (lower.contains("study") || lower.contains("exam") || lower.contains("academic") || lower.contains("school")) out.add("academic_stress");
            if (lower.contains("relationship") || lower.contains("partner") || lower.contains("family") || lower.contains("parent") || lower.contains("friend")) out.add("relationship_concerns");
            if (lower.contains("money") || lower.contains("finance") || lower.contains("debt")) out.add("financial_concerns");
            if (lower.contains("sad") || lower.contains("depressed") || lower.contains("down") || lower.contains("hopeless")) out.add("low_mood");
            if (lower.contains("anxious") || lower.contains("anxiety") || lower.contains("panic") || lower.contains("worry")) out.add("anxiety_related");
            if (lower.contains("alcohol") || lower.contains("drug") || lower.contains("substance")) out.add("substance_related");
            if (lower.contains("safe") || lower.contains("safeguard") || lower.contains("abuse")) out.add("safeguarding");
            if (lower.contains("hurt") || lower.contains("harm") || lower.contains("self-harm") || lower.contains("end it")) out.add("self_harm_concern");
            if (lower.contains("emergency") || lower.contains("crisis") || lower.contains("immediate")) out.add("crisis_emergency_concern");
        }
        return CONCERN_AREA_NAMES.retainAll(out) ? new ArrayList<>(out) : new ArrayList<>(out);
    }

    private String derivePrimaryConcern(CheckInRecord today, List<Map<String, Object>> conv) {
        var areas = deriveConcernAreas(today, conv);
        if (areas.isEmpty()) return "general_wellbeing";
        return areas.get(0);
    }

    private String computeRiskLevel(CheckInRecord today, List<Map<String, Object>> conv) {
        double score = 0.0;
        if (today != null) {
            if (today.getMood() != null) {
                switch (today.getMood()) {
                    case "great": score += 0.05; break;
                    case "good": score += 0.12; break;
                    case "okay": score += 0.25; break;
                    case "low": score += 0.55; break;
                    case "very_low": score += 0.75; break;
                }
            }
            if (today.getStressLevel() != null) score += (today.getStressLevel() - 1) / 9.0 * 0.4;
            if (today.getEnergyLevel() != null) score += (1 - (today.getEnergyLevel() - 1) / 9.0) * 0.25;
            if (today.getSleepQuality() != null) score += (1 - (today.getSleepQuality() - 1) / 9.0) * 0.2;
            if (today.getConnectionLevel() != null) score += (1 - (today.getConnectionLevel() - 1) / 9.0) * 0.15;
            if (today.getNoteText() != null && !today.getNoteText().isBlank()) score += 0.08;
        }
        for (var m : conv) {
            String t = (String) m.get("text");
            if (t == null) continue;
            String lower = t.toLowerCase(Locale.ROOT);
            if (lower.contains("self-harm") || lower.contains("end it") || lower.contains("not worth living")
                    || lower.contains("kill myself") || lower.contains("can't go on")) score += 0.35;
            else if (lower.contains("hopeless") || lower.contains("alone") || lower.contains("trauma")
                    || lower.contains("panic")) score += 0.15;
        }
        String level = "LOW";
        if (score >= 0.7) level = "CRITICAL";
        else if (score >= 0.5) level = "HIGH";
        else if (score >= 0.28) level = "MODERATE";
        return level;
    }

    private String suggestedSupport(String riskLevel, String primaryConcern) {
        return switch (riskLevel) {
            case "CRITICAL" -> "We recommend getting immediate support. Please use the urgent support options below.";
            case "HIGH" -> "We recommend connecting with a qualified professional as soon as you can.";
            case "MODERATE" -> "You may benefit from speaking with someone. A suitable professional is listed below.";
            default -> "Things appear generally stable. Support is available whenever you need it.";
        };
    }

    private double matchScore(User expert, List<String> userLanguages, List<String> concerns, String preferredPrimary, String riskLevel) {
        double score = 0.0;
        // Active and relevant role base
        score += 0.2;
        // Specialisation overlap with concerns
        List<String> specs = expert.getSpecialisations();
        if (specs != null) {
            long overlap = specs.stream().filter(s -> concerns.stream().anyMatch(c -> fuzzyMatch(s, c))).count();
            score += overlap * 0.15;
        }
        // Single specialisation string overlap (legacy field)
        if (expert.getSpecialisation() != null) {
            if (concerns.stream().anyMatch(c -> fuzzyMatch(expert.getSpecialisation(), c))) score += 0.1;
        }
        // Language overlap
        List<String> expertLanguages = expert.getLanguageCodes();
        if (expertLanguages != null && !expertLanguages.isEmpty()) {
            long langOverlap = expertLanguages.stream().filter(userLanguages::contains).count();
            score += langOverlap * 0.12;
            if (expertLanguages.contains(preferredPrimary)) score += 0.1;
        }
        // Risk suitability: higher risk -> prefer counselors with relevant specialisations
        if (riskLevel.equals("HIGH") || riskLevel.equals("CRITICAL")) {
            if (specs != null && specs.stream().anyMatch(s -> s.toLowerCase(Locale.ROOT).contains("crisis")
                    || s.toLowerCase(Locale.ROOT).contains("trauma") || s.toLowerCase(Locale.ROOT).contains("safeguarding"))) {
                score += 0.15;
            }
        }
        return Math.min(1.0, score);
    }

    private boolean fuzzyMatch(String a, String b) {
        if (a == null || b == null) return false;
        return a.toLowerCase(Locale.ROOT).contains(b.toLowerCase(Locale.ROOT))
                || b.toLowerCase(Locale.ROOT).contains(a.toLowerCase(Locale.ROOT));
    }

    private String buildMatchReason(User expert, List<String> userLanguages, List<String> concerns, String preferredPrimary) {
        List<String> reasons = new ArrayList<>();
        List<String> specs = expert.getSpecialisations();
        if (specs != null && specs.stream().anyMatch(s -> concerns.stream().anyMatch(c -> fuzzyMatch(s, c)))) {
            reasons.add("Recommended based on your current concerns and language preferences.");
        } else if (expert.getSpecialisation() != null && concerns.stream().anyMatch(c -> fuzzyMatch(expert.getSpecialisation(), c))) {
            reasons.add("Recommended based on your current concerns and language preferences.");
        }
        if (expert.getLanguageCodes().contains(preferredPrimary)) {
            reasons.add("Speaks your preferred language \"" + preferredPrimary + "\".");
        }
        if (reasons.isEmpty()) {
            reasons.add("Listed as a available support professional.");
        }
        return String.join(" ", reasons);
    }
}
