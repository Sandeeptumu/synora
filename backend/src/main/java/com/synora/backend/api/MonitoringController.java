package com.synora.backend.api;

import com.synora.backend.audit.AuditService;
import com.synora.backend.casehub.Case;
import com.synora.backend.casehub.CaseService;
import com.synora.backend.engine.AlertEngine;
import com.synora.backend.engine.BaselineEngine;
import com.synora.backend.engine.MonitoringOrchestrationService;
import com.synora.backend.engine.TemporalEngine;
import com.synora.backend.monitoring.*;
import com.synora.backend.user.User;
import com.synora.backend.user.UserService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Monitoring endpoints: analysis submission, risk, alerts, interventions,
 * follow-ups, consents, resources.
 */
@RestController
@RequestMapping("/api")
public class MonitoringController {

    private final VoiceRecordingRepository recordingRepo;
    private final CaseService caseService;
    private final UserService userService;
    private final MonitoringOrchestrationService orchestration;
    private final CheckInRepository checkInRepo;
    private final TextAnalysisRepository textRepo;
    private final VoiceAnalysisRepository voiceRepo;
    private final BehavioralSignalRepository behaviorRepo;
    private final RiskAssessmentRepository riskRepo;
    private final AlertRepository alertRepo;
    private final InterventionRepository interventionRepo;
    private final FollowUpRepository followUpRepo;
    private final ConsentRepository consentRepo;
    private final ResourceRepository resourceRepo;
    private final AlertEngine alertEngine;
    private final BaselineEngine baselineEngine;
    private final AuditService audit;

    public MonitoringController(VoiceRecordingRepository recordingRepo, CaseService caseService, UserService userService,
                                MonitoringOrchestrationService orchestration,
                                CheckInRepository checkInRepo,
                                TextAnalysisRepository textRepo,
                                VoiceAnalysisRepository voiceRepo,
                                BehavioralSignalRepository behaviorRepo,
                                RiskAssessmentRepository riskRepo,
                                AlertRepository alertRepo,
                                InterventionRepository interventionRepo,
                                FollowUpRepository followUpRepo,
                                ConsentRepository consentRepo,
                                ResourceRepository resourceRepo,
                                AlertEngine alertEngine,
                                BaselineEngine baselineEngine,
                                AuditService audit) {
        this.recordingRepo = recordingRepo;
        this.caseService = caseService;
        this.userService = userService;
        this.orchestration = orchestration;
        this.checkInRepo = checkInRepo;
        this.textRepo = textRepo;
        this.voiceRepo = voiceRepo;
        this.behaviorRepo = behaviorRepo;
        this.riskRepo = riskRepo;
        this.alertRepo = alertRepo;
        this.interventionRepo = interventionRepo;
        this.followUpRepo = followUpRepo;
        this.consentRepo = consentRepo;
        this.resourceRepo = resourceRepo;
        this.alertEngine = alertEngine;
        this.baselineEngine = baselineEngine;
        this.audit = audit;
    }

    // ---------- helpers ----------

    private User actor() {
        return userService.requireByPrincipal(com.synora.backend.security.CurrentUser.username());
    }

    private Case authorizedCase(String caseNumber) {
        Case c = caseService.requireByNumber(caseNumber);
        caseService.assertCanView(actor(), c);
        return c;
    }

    private static List<String> csv(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split(",")).map(String::trim).filter(x -> !x.isEmpty()).toList();
    }

    // ---------- analysis ----------

    /** Text-only or mixed check-in with JSON metadata. */
    public record TextCheckInRequest(String text, String mood,
                                     Double interactionFrequencyDelta,
                                     Double responseIntervalDelta) {}

    @PostMapping("/analysis/text")
    public Map<String, Object> analyzeText(@RequestParam String caseNumber,
                                           @RequestBody TextCheckInRequest req) {
        Case c = authorizedCase(caseNumber);
        var result = orchestration.runPipeline(c, req.text(), null, req.mood(),
                req.interactionFrequencyDelta(), req.responseIntervalDelta());
        audit.log("CHECKIN_SUBMITTED", "CASE", c.getCaseNumber() + " channel=TEXT");
        return pipelineResponse(result, false);
    }

    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/analysis/voice")
    public Map<String, Object> analyzeVoice(@RequestParam String caseNumber,
                                            @RequestParam(required = false) String text,
                                            @RequestParam(required = false) String mood,
                                            @RequestParam(required = false) Double interactionFrequencyDelta,
                                            @RequestParam(required = false) Double responseIntervalDelta,
                                            @RequestParam("file") MultipartFile file) {
        Case c = authorizedCase(caseNumber);
        assertVoiceAccess(c);
        if (!c.getVictim().getId().equals(actor().getId()))
            throw com.synora.backend.exception.ApiException.forbidden("Only the case owner can submit a recording");
        String type = file.getContentType() == null ? "" : file.getContentType().split(";")[0].trim().toLowerCase(Locale.ROOT);
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024)
            throw com.synora.backend.exception.ApiException.badRequest("Record an audio note smaller than 10 MB");
        if (!List.of("audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg").contains(type))
            throw com.synora.backend.exception.ApiException.badRequest("Unsupported recording format. Please record again.");
        byte[] bytes;
        try { bytes = file.getBytes(); } catch (java.io.IOException e) {
            throw com.synora.backend.exception.ApiException.badRequest("Could not read recording. Please try again.");
        }
        var result = orchestration.runPipeline(c, text, file, mood,
                interactionFrequencyDelta, responseIntervalDelta);
        recordingRepo.save(new VoiceRecording(result.checkIn(), bytes, type));
        audit.log("CHECKIN_SUBMITTED", "CASE", c.getCaseNumber() + " channel=VOICE");
        return pipelineResponse(result, false);
    }

    private void assertVoiceAccess(Case c) {
        User u = actor();
        boolean owner = c.getVictim().getId().equals(u.getId());
        boolean counselor = "COUNSELOR".equals(u.getRole()) && c.getAssignedCounselor() != null
                && c.getAssignedCounselor().getId().equals(u.getId());
        if (!owner && !counselor) throw com.synora.backend.exception.ApiException.forbidden("Only the owner and assigned counselor can access voice notes");
        if (!consentRepo.findFirstByUserIdAndModalityOrderByCreatedAtDesc(c.getVictim().getId(), "VOICE_ANALYSIS")
                .map(Consent::isGranted).orElse(false))
            throw com.synora.backend.exception.ApiException.forbidden("Voice consent is not active");
    }

    @GetMapping("/cases/{caseNumber}/recordings")
    public List<Map<String, Object>> recordings(@PathVariable String caseNumber) {
        Case c = authorizedCase(caseNumber);
        assertVoiceAccess(c);
        Set<UUID> ids = new HashSet<>(recordingRepo.recordingIds(c.getId()));
        return checkInRepo.findByCaseRefIdOrderByCreatedAtDesc(c.getId()).stream()
            .filter(ci -> ids.contains(ci.getId())).map(ci -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", ci.getId()); item.put("createdAt", ci.getCreatedAt());
                item.put("mood", ci.getSelfReportedMood());
                return item;
            }).toList();
    }

    @GetMapping("/cases/{caseNumber}/recordings/{id}")
    public org.springframework.http.ResponseEntity<byte[]> recording(@PathVariable String caseNumber, @PathVariable UUID id) {
        Case c = authorizedCase(caseNumber);
        assertVoiceAccess(c);
        VoiceRecording v = recordingRepo.findById(id)
            .orElseThrow(() -> com.synora.backend.exception.ApiException.notFound("Recording not found"));
        if (!v.getCheckIn().getCaseRef().getId().equals(c.getId()))
            throw com.synora.backend.exception.ApiException.notFound("Recording not found");
        audit.log("VOICE_RECORDING_ACCESSED", "CASE", c.getCaseNumber() + " checkin=" + id);
        return org.springframework.http.ResponseEntity.ok()
            .header("Cache-Control", "no-store, private")
            .header("X-Content-Type-Options", "nosniff")
            .contentType(org.springframework.http.MediaType.parseMediaType(v.getContentType()))
            .body(v.getAudio());
    }

    /** Demo-mode full pipeline run (counselor/officer/admin, on behalf of a case). */
    @PostMapping("/analysis/demo-run")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('COUNSELOR','CASE_OFFICER','ADMIN')")
    public Map<String, Object> demoRun(@RequestParam String caseNumber,
                                       @RequestBody TextCheckInRequest req) {
        Case c = caseService.requireByNumber(caseNumber);
        caseService.assertCanView(actor(), c);
        String text = req.text() != null ? req.text() : DEFAULT_DEMO_TEXT;
        var result = orchestration.runPipeline(c, text, null, req.mood(),
                req.interactionFrequencyDelta(), req.responseIntervalDelta());
        audit.log("DEMO_PIPELINE_RUN", "CASE", c.getCaseNumber());
        return pipelineResponse(result, true);
    }

    private static final String DEFAULT_DEMO_TEXT =
            "I feel numb and can't sleep at night. Everything feels heavy and I don't see the point lately.";

    private Map<String, Object> pipelineResponse(MonitoringOrchestrationService.PipelineResult result,
                                                 boolean includeDetails) {
        Map<String, Object> resp = new LinkedHashMap<>();
        RiskAssessment ra = result.riskAssessment();
        resp.put("checkinId", result.checkIn().getId().toString());
        resp.put("riskScore", ra.getRiskScore());
        resp.put("riskLevel", ra.getRiskLevel());
        resp.put("trend", ra.getTrend());
        resp.put("baselineDeviation", ra.getBaselineDeviation());
        resp.put("signalAgreement", ra.getSignalAgreement());
        resp.put("consistency", ra.getConsistencyFlag());
        if (result.textAnalysis() != null) {
            resp.put("text", Map.of(
                    "distressScore", result.textAnalysis().getDistressScore(),
                    "sentiment", result.textAnalysis().getSentiment(),
                    "themes", csv(result.textAnalysis().getThemes()),
                    "sleepDisruption", result.textAnalysis().isSleepDisruption(),
                    "urgency", result.textAnalysis().isUrgency(),
                    "provider", result.textAnalysis().getProvider()));
        }
        if (result.voiceAnalysis() != null) {
            resp.put("voice", Map.of(
                    "distressScore", result.voiceAnalysis().getDistressScore(),
                    "toneIndicators", csv(result.voiceAnalysis().getToneIndicators()),
                    "energyLevel", result.voiceAnalysis().getEnergyLevel(),
                    "provider", result.voiceAnalysis().getProvider()));
        }
        if (result.behavioralSignal() != null) {
            resp.put("behavior", Map.of(
                    "deviation", result.behavioralSignal().getDeviation(),
                    "indicators", csv(result.behavioralSignal().getIndicators())));
        }
        resp.put("baseline", Map.of(
                "baselineDistress", result.baseline().baselineDistress(),
                "currentDistress", result.baseline().currentDistress(),
                "deviation", result.baseline().deviation(),
                "interpretation", result.baseline().interpretation()));
        resp.put("temporal", Map.of(
                "previousScore", result.temporal().previousScore(),
                "currentScore", result.temporal().currentScore(),
                "trend", result.temporal().trend()));
        resp.put("crossSensing", Map.of(
                "signalAgreement", result.cross().signalAgreement(),
                "consistencyFlag", result.cross().consistencyFlag(),
                "crossModalDeviation", result.cross().crossModalDeviation(),
                "modalitiesCompared", result.cross().modalitiesCompared()));
        resp.put("factors", result.riskOutput().factors().stream()
                .map(f -> Map.of("factor", f.factor(), "explanation", f.explanation(),
                        "contribution", f.contribution()))
                .toList());
        if (result.alert() != null) {
            resp.put("alert", Map.of(
                    "id", result.alert().getId().toString(),
                    "severity", result.alert().getSeverity(),
                    "status", result.alert().getStatus(),
                    "title", result.alert().getTitle()));
        }
        if (includeDetails) {
            resp.put("provider", ra.getProvider());
        }
        resp.put("disclaimer", "AI-Assisted Risk Indication — Not a Medical Diagnosis");
        return resp;
    }

    // ---------- signals / risk / baseline ----------

    @GetMapping("/cases/{caseNumber}/risk")
    public Map<String, Object> currentRisk(@PathVariable String caseNumber,
                                           @RequestParam(required = false) boolean silent) {
        Case c = caseService.requireByNumber(caseNumber);
        caseService.assertCanView(actor(), c);
        if (!silent) audit.log("RISK_VIEWED", "CASE", caseNumber);
        var latest = riskRepo.findFirstByCaseRefIdOrderByCreatedAtDesc(c.getId());
        if (latest.isEmpty()) {
            return Map.of("caseNumber", caseNumber, "riskScore", 0.0, "riskLevel", "LOW",
                    "trend", "STABLE", "disclaimer", "AI-Assisted Risk Indication — Not a Medical Diagnosis");
        }
        RiskAssessment ra = latest.get();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("caseNumber", caseNumber);
        out.put("riskScore", ra.getRiskScore());
        out.put("riskLevel", ra.getRiskLevel());
        out.put("trend", ra.getTrend());
        out.put("textScore", ra.getTextScore());
        out.put("voiceScore", ra.getVoiceScore());
        out.put("behaviorScore", ra.getBehaviorScore());
        out.put("baselineDeviation", ra.getBaselineDeviation());
        out.put("signalAgreement", ra.getSignalAgreement());
        out.put("consistency", ra.getConsistencyFlag());
        out.put("createdAt", ra.getCreatedAt().toString());
        out.put("disclaimer", "AI-Assisted Risk Indication — Not a Medical Diagnosis");
        return out;
    }

    @GetMapping("/cases/{caseNumber}/risk-history")
    public List<Map<String, Object>> riskHistory(@PathVariable String caseNumber,
                                                 @RequestParam(defaultValue = "90") int days) {
        Case c = authorizedCase(caseNumber);
        Instant since = Instant.now().minus(days, java.time.temporal.ChronoUnit.DAYS);
        return riskRepo.findByCaseRefIdOrderByCreatedAtAsc(c.getId()).stream()
                .filter(ra -> ra.getCreatedAt().isAfter(since))
                .map(ra -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", ra.getCreatedAt().toString());
                    m.put("riskScore", ra.getRiskScore());
                    m.put("riskLevel", ra.getRiskLevel());
                    m.put("trend", ra.getTrend());
                    m.put("textScore", ra.getTextScore());
                    m.put("voiceScore", ra.getVoiceScore());
                    m.put("behaviorScore", ra.getBehaviorScore());
                    return m;
                }).toList();
    }

    @GetMapping("/cases/{caseNumber}/signals")
    public Map<String, Object> signals(@PathVariable String caseNumber) {
        Case c = authorizedCase(caseNumber);
        List<CheckIn> checkIns = checkInRepo.findByCaseRefIdOrderByCreatedAtDesc(c.getId());
        Map<String, Object> out = new LinkedHashMap<>();
        // Latest text signal
        for (CheckIn ci : checkIns) {
            var ta = textRepo.findByCheckInId(ci.getId()).orElse(null);
            if (ta != null) {
                out.put("text", Map.of(
                        "distressScore", ta.getDistressScore(),
                        "sentiment", ta.getSentiment(),
                        "themes", csv(ta.getThemes()),
                        "emotionalIndicators", csv(ta.getEmotionalIndicators()),
                        "sleepDisruption", ta.isSleepDisruption(),
                        "urgency", ta.isUrgency(),
                        "confidence", ta.getConfidence(),
                        "timestamp", ta.getCreatedAt().toString()));
                break;
            }
        }
        for (CheckIn ci : checkIns) {
            var va = voiceRepo.findByCheckInId(ci.getId()).orElse(null);
            if (va != null) {
                out.put("voice", Map.of(
                        "distressScore", va.getDistressScore(),
                        "toneIndicators", csv(va.getToneIndicators()),
                        "energyLevel", va.getEnergyLevel(),
                        "speechRate", va.getSpeechRate(),
                        "confidence", va.getConfidence(),
                        "timestamp", va.getCreatedAt().toString()));
                break;
            }
        }
        behaviorRepo.findByCaseRefIdOrderByCreatedAtDesc(c.getId()).stream()
                .findFirst()
                .ifPresent(bs -> out.put("behavior", Map.of(
                        "deviation", bs.getDeviation(),
                        "interactionFrequency", bs.getInteractionFrequency(),
                        "baselineInteractionFrequency", bs.getBaselineInteractionFrequency(),
                        "responseIntervalHours", bs.getResponseIntervalHours(),
                        "baselineResponseIntervalHours", bs.getBaselineResponseIntervalHours(),
                        "indicators", csv(bs.getIndicators()),
                        "timestamp", bs.getCreatedAt().toString())));
        out.put("disclaimer", "AI-Assisted Risk Indication — Not a Medical Diagnosis");
        return out;
    }

    @GetMapping("/cases/{caseNumber}/baseline")
    public Map<String, Object> baseline(@PathVariable String caseNumber) {
        Case c = authorizedCase(caseNumber);
        List<RiskAssessment> history = riskRepo.findByCaseRefIdOrderByCreatedAtAsc(c.getId());
        List<Double> scores = history.stream().map(RiskAssessment::getRiskScore).toList();
        double current = scores.isEmpty() ? 0.0 : scores.get(scores.size() - 1);
        BaselineEngine.BaselineResult b = baselineEngine.computeFromHistory(
                scores.subList(0, Math.max(0, scores.size() - 1)), current);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("caseNumber", caseNumber);
        out.put("baselineDistress", b.baselineDistress());
        out.put("currentDistress", b.currentDistress());
        out.put("deviation", b.deviation());
        out.put("interpretation", b.interpretation());
        out.put("historyCount", scores.size());
        out.put("history", history.stream().map(ra -> Map.of(
                "date", ra.getCreatedAt().toString(),
                "riskScore", ra.getRiskScore())).toList());
        return out;
    }

    @GetMapping("/cases/{caseNumber}/explainability")
    public Map<String, Object> explainability(@PathVariable String caseNumber) {
        Case c = authorizedCase(caseNumber);
        var latest = riskRepo.findFirstByCaseRefIdOrderByCreatedAtDesc(c.getId());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("caseNumber", caseNumber);
        if (latest.isEmpty()) {
            out.put("factors", List.of());
            return out;
        }
        RiskAssessment ra = latest.get();
        // Reconstruct factors from stored components
        List<Map<String, Object>> factors = new ArrayList<>();
        if (ra.getTextScore() != null && ra.getTextScore() > 0.25) {
            factors.add(Map.of("factor", "negative_emotional_language",
                    "explanation", "Elevated distress language detected in text",
                    "contribution", round3(ra.getTextScore() * 0.28)));
        }
        if (ra.getVoiceScore() != null && ra.getVoiceScore() > 0.25) {
            factors.add(Map.of("factor", "voice_signal_change",
                    "explanation", "Voice prosody indicates reduced energy or strain",
                    "contribution", round3(ra.getVoiceScore() * 0.20)));
        }
        if (ra.getBehaviorScore() != null && ra.getBehaviorScore() > 0.25) {
            factors.add(Map.of("factor", "behavioral_shift",
                    "explanation", "Interaction pattern changed from personal norm",
                    "contribution", round3(ra.getBehaviorScore() * 0.16)));
        }
        if (ra.getBaselineDeviation() != null && ra.getBaselineDeviation() >= 0.15) {
            factors.add(Map.of("factor", "baseline_deviation",
                    "explanation", "Current signals sit above this person's own baseline",
                    "contribution", round3(ra.getBaselineDeviation() * 0.14)));
        }
        if (ra.getTemporalScore() != null && ra.getTemporalScore() > 0.1) {
            factors.add(Map.of("factor", "temporal_trend",
                    "explanation", "Risk trajectory is rising over recent interactions",
                    "contribution", round3(ra.getTemporalScore() * 0.10)));
        }
        if (ra.getSignalAgreement() != null && ra.getSignalAgreement() >= 0.7) {
            factors.add(Map.of("factor", "cross_modal_consistency",
                    "explanation", "Multiple independent signals agree on the change",
                    "contribution", round3(ra.getSignalAgreement() * 0.12 * 0.5)));
        }
        factors.sort((a, b) -> Double.compare((Double) b.get("contribution"), (Double) a.get("contribution")));
        out.put("riskScore", ra.getRiskScore());
        out.put("riskLevel", ra.getRiskLevel());
        out.put("trend", ra.getTrend());
        out.put("factors", factors);
        out.put("disclaimer", "AI-Assisted Risk Indication — Not a Medical Diagnosis");
        return out;
    }

    private static double round3(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }

    // ---------- alerts ----------

    @GetMapping("/alerts")
    public List<Map<String, Object>> alerts(@RequestParam(required = false) String status,
                                            @RequestParam(required = false) String severity,
                                            @RequestParam(required = false) String caseNumber) {
        User u = actor();
        List<Case> visible = caseService.visibleTo(u);
        List<Alert> alerts = visible.stream()
                .flatMap(c -> alertRepo.findByCaseRefIdOrderByCreatedAtDesc(c.getId()).stream())
                .toList();
        List<String> visibleCases = visible.stream()
                .map(Case::getId).map(UUID::toString).collect(Collectors.toList());
        var filtered = alerts.stream()
                .filter(a -> visibleCases.contains(a.getCaseRef().getId().toString()))
                .filter(a -> caseNumber == null || caseNumber.isBlank()
                        || a.getCaseRef().getCaseNumber().equalsIgnoreCase(caseNumber))
                .filter(a -> status == null || status.isBlank() || a.getStatus().equalsIgnoreCase(status))
                .filter(a -> severity == null || severity.isBlank() || a.getSeverity().equalsIgnoreCase(severity))
                .sorted(Comparator.comparing(Alert::getCreatedAt).reversed())
                .toList();
        audit.log("ALERTS_LISTED", "ALERT", filtered.size() + " alerts");
        return filtered.stream().map(MonitoringController::alertDto).toList();
    }

    static Map<String, Object> alertDto(Alert a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId().toString());
        m.put("caseNumber", a.getCaseRef().getCaseNumber());
        m.put("severity", a.getSeverity());
        m.put("status", a.getStatus());
        m.put("riskScore", a.getRiskScore());
        m.put("signals", csv(a.getSignalsTriggered()));
        m.put("title", a.getTitle());
        m.put("escalated", a.isEscalated());
        m.put("acknowledgedBy", a.getAcknowledgedBy());
        m.put("acknowledgedAt", a.getAcknowledgedAt() == null ? null : a.getAcknowledgedAt().toString());
        m.put("resolvedBy", a.getResolvedBy());
        m.put("resolvedAt", a.getResolvedAt() == null ? null : a.getResolvedAt().toString());
        m.put("resolutionNote", a.getResolutionNote());
        m.put("createdAt", a.getCreatedAt().toString());
        return m;
    }

    @GetMapping("/alerts/{id}")
    public Map<String, Object> alert(@PathVariable UUID id) {
        Alert a = alertEngine.require(id);
        authorizedCase(a.getCaseRef().getCaseNumber());
        return alertDto(a);
    }

    @PatchMapping("/alerts/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('COUNSELOR','CASE_OFFICER','ADMIN')")
    public Map<String, Object> patchAlert(@PathVariable UUID id,
                                          @RequestBody Map<String, Object> body) {
        String action = String.valueOf(body.getOrDefault("action", ""));
        User u = actor();
        Alert a = alertEngine.require(id);
        caseService.assertCanView(u, a.getCaseRef());
        return switch (action) {
            case "acknowledge" -> alertDto(alertEngine.acknowledge(id, u.getEmail()));
            case "resolve" -> alertDto(alertEngine.resolve(id, u.getEmail(),
                    (String) body.getOrDefault("note", "")));
            default -> throw com.synora.backend.exception.ApiException.badRequest(
                    "action must be acknowledge or resolve");
        };
    }

    // ---------- interventions ----------

    public record InterventionRequest(String type, String notes, String outcome) {}

    @PostMapping("/cases/{caseNumber}/interventions")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('COUNSELOR','CASE_OFFICER','ADMIN')")
    public Map<String, Object> addIntervention(@PathVariable String caseNumber,
                                               @RequestBody InterventionRequest req) {
        Case c = authorizedCase(caseNumber);
        Intervention iv = new Intervention();
        iv.setCaseRef(c);
        iv.setCounselorEmail(actor().getEmail());
        iv.setType(req.type() == null ? "COUNSELING_SESSION" : req.type());
        iv.setNotes(req.notes() == null ? "" : req.notes());
        iv.setOutcome(req.outcome());
        interventionRepo.save(iv);
        audit.log("INTERVENTION_RECORDED", "CASE", c.getCaseNumber() + " type=" + iv.getType());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", iv.getId().toString());
        m.put("type", iv.getType());
        m.put("notes", iv.getNotes());
        m.put("outcome", iv.getOutcome());
        m.put("counselorEmail", iv.getCounselorEmail());
        m.put("createdAt", iv.getCreatedAt().toString());
        return m;
    }

    @GetMapping("/cases/{caseNumber}/interventions")
    public List<Map<String, Object>> interventions(@PathVariable String caseNumber) {
        Case c = authorizedCase(caseNumber);
        return interventionRepo.findByCaseRefIdOrderByCreatedAtDesc(c.getId()).stream()
                .map(iv -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", iv.getId().toString());
                    m.put("type", iv.getType());
                    m.put("notes", iv.getNotes());
                    m.put("outcome", iv.getOutcome());
                    m.put("counselorEmail", iv.getCounselorEmail());
                    m.put("createdAt", iv.getCreatedAt().toString());
                    return m;
                }).toList();
    }

    // ---------- follow-ups ----------

    public record FollowUpRequest(String dueDate, String type, String notes) {}

    @PostMapping("/cases/{caseNumber}/followups")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('COUNSELOR','CASE_OFFICER','ADMIN')")
    public Map<String, Object> createFollowUp(@PathVariable String caseNumber,
                                              @RequestBody FollowUpRequest req) {
        Case c = authorizedCase(caseNumber);
        FollowUp fu = new FollowUp();
        fu.setCaseRef(c);
        fu.setDueDate(LocalDate.parse(req.dueDate()));
        fu.setStatus("SCHEDULED");
        fu.setType(req.type() == null ? "CALL" : req.type());
        fu.setNotes(req.notes());
        fu.setCreatedBy(actor().getEmail());
        followUpRepo.save(fu);
        audit.log("FOLLOWUP_CREATED", "CASE", c.getCaseNumber() + " due=" + req.dueDate());
        return followUpDto(fu);
    }

    @GetMapping("/cases/{caseNumber}/followups")
    public List<Map<String, Object>> followUps(@PathVariable String caseNumber) {
        Case c = authorizedCase(caseNumber);
        return followUpRepo.findByCaseRefIdOrderByDueDateAsc(c.getId()).stream()
                .map(MonitoringController::followUpDto).toList();
    }

    @PatchMapping("/followups/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('COUNSELOR','CASE_OFFICER','ADMIN')")
    public Map<String, Object> patchFollowUp(@PathVariable UUID id,
                                             @RequestBody Map<String, Object> body) {
        FollowUp fu = followUpRepo.findById(id)
                .orElseThrow(() -> com.synora.backend.exception.ApiException.notFound("Follow-up not found"));
        authorizedCase(fu.getCaseRef().getCaseNumber());
        if (body.containsKey("status")) {
            String st = String.valueOf(body.get("status")).toUpperCase(Locale.ROOT);
            if (!List.of("SCHEDULED", "COMPLETED", "MISSED", "RESCHEDULED").contains(st)) {
                throw com.synora.backend.exception.ApiException.badRequest("Invalid status");
            }
            fu.setStatus(st);
            if ("COMPLETED".equals(st)) fu.setCompletedAt(Instant.now());
        }
        if (body.containsKey("dueDate")) fu.setDueDate(LocalDate.parse(String.valueOf(body.get("dueDate"))));
        if (body.containsKey("notes")) fu.setNotes(String.valueOf(body.get("notes")));
        audit.log("FOLLOWUP_UPDATED", "CASE", fu.getCaseRef().getCaseNumber() + " → " + fu.getStatus());
        return followUpDto(fu);
    }

    static Map<String, Object> followUpDto(FollowUp fu) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", fu.getId().toString());
        m.put("caseNumber", fu.getCaseRef().getCaseNumber());
        m.put("dueDate", fu.getDueDate().toString());
        m.put("status", fu.getStatus());
        m.put("type", fu.getType());
        m.put("notes", fu.getNotes());
        m.put("createdBy", fu.getCreatedBy());
        m.put("completedAt", fu.getCompletedAt() == null ? null : fu.getCompletedAt().toString());
        m.put("createdAt", fu.getCreatedAt().toString());
        return m;
    }

    // ---------- consents ----------

    @GetMapping("/consents")
    public List<Map<String, Object>> consents() {
        User u = actor();
        return consentRepo.findByUserIdOrderByCreatedAtDesc(u.getId()).stream()
                .map(c -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("modality", c.getModality());
                    m.put("granted", c.isGranted());
                    m.put("grantedAt", c.getGrantedAt() == null ? null : c.getGrantedAt().toString());
                    m.put("revokedAt", c.getRevokedAt() == null ? null : c.getRevokedAt().toString());
                    return m;
                }).toList();
    }

    @PostMapping("/consents")
    public Map<String, Object> setConsent(@RequestBody Map<String, Object> body) {
        User u = actor();
        String modality = String.valueOf(body.get("modality"));
        boolean granted = Boolean.TRUE.equals(body.get("granted"));
        if (!List.of("TEXT_ANALYSIS", "VOICE_ANALYSIS", "BEHAVIORAL_ANALYSIS").contains(modality)) {
            throw com.synora.backend.exception.ApiException.badRequest("Unknown modality");
        }
        Consent c = new Consent();
        c.setUser(u);
        c.setModality(modality);
        c.setGranted(granted);
        if (granted) {
            c.setGrantedAt(Instant.now());
        } else {
            c.setRevokedAt(Instant.now());
        }
        consentRepo.save(c);
        audit.log(granted ? "CONSENT_GRANTED" : "CONSENT_REVOKED", "CONSENT", modality);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("modality", modality);
        m.put("granted", granted);
        return m;
    }

    // ---------- resources ----------

    @GetMapping("/resources")
    public List<Map<String, Object>> resources(@RequestParam(required = false) String category,
                                               @RequestParam(required = false) String theme) {
        List<Resource> all = resourceRepo.findAll();
        return all.stream()
                .filter(r -> category == null || category.isBlank()
                        || r.getCategory().equalsIgnoreCase(category))
                .filter(r -> theme == null || theme.isBlank()
                        || (r.getThemes() != null && csv(r.getThemes()).stream()
                                .anyMatch(t -> t.equalsIgnoreCase(theme))))
                .sorted(Comparator.comparing(Resource::getTitle))
                .map(MonitoringController::resourceDto).toList();
    }

    @GetMapping("/resources/recommended/{caseNumber}")
    public List<Map<String, Object>> recommended(@PathVariable String caseNumber) {
        Case c = authorizedCase(caseNumber);
        Set<String> themes = new HashSet<>();
        for (CheckIn ci : checkInRepo.findByCaseRefIdOrderByCreatedAtDesc(c.getId())) {
            var ta = textRepo.findByCheckInId(ci.getId()).orElse(null);
            if (ta != null) {
                themes.addAll(csv(ta.getThemes()));
                if (themes.size() > 6) break;
            }
        }
        Set<String> finalThemes = themes;
        return resourceRepo.findByReviewedTrue().stream()
                .filter(r -> r.getThemes() != null
                        && csv(r.getThemes()).stream().anyMatch(finalThemes::contains))
                .sorted(Comparator.comparing(Resource::getTitle))
                .limit(6)
                .map(MonitoringController::resourceDto).toList();
    }

    static Map<String, Object> resourceDto(Resource r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId().toString());
        m.put("title", r.getTitle());
        m.put("category", r.getCategory());
        m.put("description", r.getDescription());
        m.put("availability", r.getAvailability());
        m.put("language", r.getLanguage());
        m.put("contact", r.getContact());
        m.put("link", r.getLink());
        m.put("reviewed", r.isReviewed());
        m.put("themes", csv(r.getThemes()));
        return m;
    }

    // ---------- victim self-view ----------

    /** Supportive, non-diagnostic summary for the victim's own dashboard. */
    @GetMapping("/me/wellness")
    public Map<String, Object> wellness() {
        User u = actor();
        List<Case> cases = caseService.visibleTo(u);
        Map<String, Object> out = new LinkedHashMap<>();
        List<Map<String, Object>> caseSummaries = new ArrayList<>();
        for (Case c : cases) {
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("caseNumber", c.getCaseNumber());
            cm.put("title", c.getTitle());
            cm.put("status", c.getStatus());
            cm.put("counselor", c.getAssignedCounselor() != null
                    ? c.getAssignedCounselor().getFullName() : null);
            var history = riskRepo.findByCaseRefIdOrderByCreatedAtAsc(c.getId());
            cm.put("checkInCount", history.size());
            if (!history.isEmpty()) {
                double avg = history.stream().mapToDouble(RiskAssessment::getRiskScore).average().orElse(0);
                double last = history.get(history.size() - 1).getRiskScore();
                // Supportive language only — never expose raw risk levels to victims.
                String tone = last > 0.6 ? "We noticed some changes in your recent check-ins. "
                        + "You may want to connect with your support team."
                        : last > 0.3 ? "It looks like things have been a bit up and down lately. "
                        + "Remember your support team is here for you."
                        : "Your recent check-ins suggest you are managing. Keep taking care of yourself.";
                cm.put("wellnessTone", tone);
                cm.put("personalTrend", avg > last ? "improving" : avg < last ? "shifting" : "steady");
                cm.put("lastCheckIn", history.get(history.size() - 1).getCreatedAt().toString());
            } else {
                cm.put("wellnessTone", "Complete your first check-in so your support team can understand how you're doing.");
                cm.put("personalTrend", "steady");
            }
            caseSummaries.add(cm);
        }
        out.put("cases", caseSummaries);
        out.put("disclaimer",
                "Your information is analyzed only with your consent and is used to help connect you with appropriate human support.");
        return out;
    }
}
