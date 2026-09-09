package com.synora.backend.casehub;

import com.synora.backend.audit.AuditService;
import com.synora.backend.exception.ApiException;
import com.synora.backend.user.User;
import com.synora.backend.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Case lifecycle, assignment and authorization logic.
 */
@Service
public class CaseService {

    public static final List<String> STATUSES = List.of("OPEN", "IN_PROGRESS", "MONITORING", "CLOSED");

    private final CaseRepository repo;
    private final UserService userService;
    private final AuditService audit;
    private final com.synora.backend.audit.AuditLogRepository auditRepo;

    public CaseService(CaseRepository repo, UserService userService, AuditService audit,
                       com.synora.backend.audit.AuditLogRepository auditRepo) {
        this.repo = repo;
        this.userService = userService;
        this.audit = audit;
        this.auditRepo = auditRepo;
    }

    @Transactional
    public Case create(UUID victimUserId, String title, String category, String region,
                       String summary, UUID officerId) {
        User victim = userService.require(victimUserId);
        if (!"VICTIM".equals(victim.getRole()) || !victim.isActive()) throw ApiException.badRequest("Choose an active personal account");
        Case c = new Case();
        c.setCaseNumber("CASE-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24).toUpperCase(Locale.ROOT));
        c.setTitle(title);
        c.setCategory(category);
        c.setRegion(region);
        c.setSummary(summary);
        c.setStatus("OPEN");
        c.setPriority("MEDIUM");
        c.setVictim(victim);
        if (officerId != null) {
            c.setAssignedOfficer(userService.require(officerId));
        }
        Case saved = repo.saveAndFlush(c);
        audit.log("CASE_CREATED", "CASE", saved.getCaseNumber());
        return saved;
    }

    @Transactional(readOnly = true)
    public Case requireByNumber(String caseNumber) {
        return repo.findByCaseNumberIgnoreCase(caseNumber)
                .orElseThrow(() -> ApiException.notFound("Case not found: " + caseNumber));
    }

    @Transactional(readOnly = true)
    public Case require(UUID id) {
        return repo.findById(id).orElseThrow(() -> ApiException.notFound("Case not found"));
    }

    @Transactional(readOnly = true)
    public List<Case> visibleTo(User actor) {
        return switch (actor.getRole()) {
            case "ADMIN" -> repo.findAll();
            case "COUNSELOR" -> repo.findByAssignedCounselorIdOrderByCreatedAtDesc(actor.getId());
            case "CASE_OFFICER" -> repo.findByAssignedOfficerIdOrderByCreatedAtDesc(actor.getId());
            case "VICTIM" -> repo.findByVictimIdOrderByCreatedAtDesc(actor.getId());
            default -> List.of();
        };
    }

    /** Authorization: victims see only their cases; counselors/officers only assigned ones; admin all. */
    public void assertCanView(User actor, Case c) {
        switch (actor.getRole()) {
            case "ADMIN" -> {}
            case "VICTIM" -> {
                if (!c.getVictim().getId().equals(actor.getId())) {
                    throw ApiException.forbidden("You can only view your own cases");
                }
            }
            case "COUNSELOR" -> {
                if (c.getAssignedCounselor() == null
                        || !c.getAssignedCounselor().getId().equals(actor.getId())) {
                    throw ApiException.forbidden("Case not assigned to you");
                }
            }
            case "CASE_OFFICER" -> {
                if (c.getAssignedOfficer() == null
                        || !c.getAssignedOfficer().getId().equals(actor.getId())) {
                    throw ApiException.forbidden("Case not assigned to you");
                }
            }
            default -> throw ApiException.forbidden("Access denied");
        }
    }

    @Transactional
    public Case assignCounselor(String caseNumber, UUID counselorId) {
        Case c = requireByNumber(caseNumber);
        User counselor = userService.require(counselorId);
        if (!"COUNSELOR".equals(counselor.getRole()) || !counselor.isActive()) {
            throw ApiException.badRequest("Choose an active counselor");
        }
        c.setAssignedCounselor(counselor);
        if ("OPEN".equals(c.getStatus())) c.setStatus("IN_PROGRESS");
        audit.log("CASE_ASSIGNED", "CASE", c.getCaseNumber() + " → " + counselor.getEmail());
        return c;
    }

    @Transactional
    public Case assignOfficer(String caseNumber, UUID officerId) {
        Case c = requireByNumber(caseNumber);
        User officer = userService.require(officerId);
        if ((!"CASE_OFFICER".equals(officer.getRole()) && !"ADMIN".equals(officer.getRole())) || !officer.isActive()) {
            throw ApiException.badRequest("Choose an active case officer");
        }
        c.setAssignedOfficer(officer);
        audit.log("CASE_ASSIGNED", "CASE", c.getCaseNumber() + " officer → " + officer.getEmail());
        return c;
    }

    @Transactional
    public Case updateStatus(String caseNumber, String status) {
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw ApiException.badRequest("Invalid status: " + status);
        }
        Case c = requireByNumber(caseNumber);
        c.setStatus(normalized);
        audit.log("CASE_UPDATED", "CASE", c.getCaseNumber() + " status → " + normalized);
        return c;
    }

    @Transactional
    public Case updatePriority(Case c, String priority) {
        c.setPriority(priority);
        return repo.save(c);
    }

    /** Builds a chronological timeline for a case from audit entries mentioning it. */
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String, Object>> timelineFor(Case c) {
        var entries = auditRepo.findByDetailsContainingIgnoreCaseOrderByCreatedAtAsc(c.getCaseNumber());
        java.util.List<java.util.Map<String, Object>> events = new java.util.ArrayList<>();
        for (var e : entries) {
            String type = switch (e.getAction()) {
                case "CASE_CREATED" -> "CASE_OPENED";
                case "CASE_ASSIGNED" -> "ASSIGNED";
                case "ALERT_CREATED" -> "ALERT_GENERATED";
                case "ALERT_ACKNOWLEDGED" -> "COUNSELOR_REVIEW";
                case "INTERVENTION_RECORDED" -> "INTERVENTION";
                case "FOLLOWUP_CREATED" -> "FOLLOW_UP";
                case "CHECKIN_SUBMITTED" -> "CHECK_IN";
                case "DEMO_PIPELINE_RUN" -> "AI_ANALYSIS";
                case "RISK_ASSESSED" -> "RISK_INCREASE";
                default -> null;
            };
            if (type == null) continue;
            events.add(new java.util.LinkedHashMap<String, Object>() {{
                put("type", type);
                put("label", prettify(type));
                put("description", e.getDetails());
                put("actor", e.getActor());
                put("timestamp", e.getCreatedAt().toString());
            }});
        }
        return events;
    }

    private static String prettify(String s) {
        String[] parts = s.toLowerCase(Locale.ROOT).split("_");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isBlank()) {
                if (!sb.isEmpty()) sb.append(' ');
                sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
            }
        }
        return sb.toString();
    }

    private String nextCaseNumber() {
        long count = repo.count() + 2000;
        String candidate;
        int attempt = 0;
        do {
            candidate = "CASE-" + (count + attempt * 7);
            attempt++;
        } while (repo.findByCaseNumberIgnoreCase(candidate).isPresent() && attempt < 500);
        return candidate;
    }

    public Instant now() { return Instant.now(); }
}
