package com.synora.backend.api;

import com.synora.backend.ai.AIRouter;
import com.synora.backend.audit.AuditLogRepository;
import com.synora.backend.casehub.CaseRepository;
import com.synora.backend.config.SynoraProperties;
import com.synora.backend.monitoring.AlertRepository;
import com.synora.backend.monitoring.RiskAssessmentRepository;
import com.synora.backend.user.User;
import com.synora.backend.user.UserRepository;
import com.synora.backend.user.UserService;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.*;

/**
 * Admin endpoints: users, audit logs, system health, AI engine status, config.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepo;
    private final UserService userService;
    private final AuditLogRepository auditRepo;
    private final CaseRepository caseRepo;
    private final AlertRepository alertRepo;
    private final RiskAssessmentRepository riskRepo;
    private final AIRouter aiRouter;
    private final SynoraProperties props;
    private final DataSource dataSource;

    public AdminController(UserRepository userRepo, UserService userService,
                           AuditLogRepository auditRepo, CaseRepository caseRepo,
                           AlertRepository alertRepo, RiskAssessmentRepository riskRepo,
                           AIRouter aiRouter, SynoraProperties props, DataSource dataSource) {
        this.userRepo = userRepo;
        this.userService = userService;
        this.auditRepo = auditRepo;
        this.caseRepo = caseRepo;
        this.alertRepo = alertRepo;
        this.riskRepo = riskRepo;
        this.aiRouter = aiRouter;
        this.props = props;
        this.dataSource = dataSource;
    }

    // ---------- system health ----------

    @GetMapping("/system-health")
    public Map<String, Object> systemHealth() {
        Map<String, Object> out = new LinkedHashMap<>();

        boolean dbOk;
        String dbVersion = "unknown";
        try (Connection conn = dataSource.getConnection()) {
            dbOk = conn.isValid(2);
            dbVersion = conn.getMetaData().getDatabaseProductVersion();
        } catch (Exception e) {
            dbOk = false;
        }

        boolean aiOnline = aiRouter.ollamaOnline();
        String provider = aiRouter.activeProviderName();

        out.put("services", List.of(
                Map.of("name", "Backend API", "status", "OPERATIONAL", "detail", "Spring Boot 3 / Java 17"),
                Map.of("name", "AI Engine", "status", aiOnline ? "OPERATIONAL" : "DEGRADED",
                        "detail", aiOnline ? "Ollama online (" + props.ai().ollama().model() + ")"
                                : "Deterministic demo provider (Ollama offline)"),
                Map.of("name", "PostgreSQL", "status", dbOk ? "CONNECTED" : "DOWN",
                        "detail", "v" + dbVersion),
                Map.of("name", "Authentication", "status", "OPERATIONAL", "detail", "JWT + RBAC"),
                Map.of("name", "Alert Service", "status", "OPERATIONAL",
                        "detail", "Escalation timeout: " + props.alerts().escalationMinutes() + " min")));
        out.put("aiProvider", provider);
        out.put("ollamaOnline", aiOnline);
        out.put("checkedAt", Instant.now().toString());
        return out;
    }

    // ---------- configuration ----------

    @GetMapping("/config")
    public Map<String, Object> config() {
        SynoraProperties.Risk r = props.risk();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("thresholds", Map.of(
                "moderate", r.thresholdModerate(),
                "high", r.thresholdHigh(),
                "critical", r.thresholdCritical(),
                "alertThreshold", r.alertThreshold()));
        out.put("weights", Map.of(
                "text", r.weightText(),
                "voice", r.weightVoice(),
                "behavior", r.weightBehavior(),
                "baseline", r.weightBaseline(),
                "temporal", r.weightTemporal(),
                "crossModal", r.weightCrossmodal()));
        out.put("alertEscalationMinutes", props.alerts().escalationMinutes());
        out.put("note", "Prototype/demo thresholds — not clinically validated.");
        return out;
    }

    // ---------- audit logs ----------

    @GetMapping("/audit-logs")
    public Map<String, Object> auditLogs(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "100") int size,
                                         @RequestParam(required = false) String action) {
        var all = auditRepo.findTop200ByOrderByCreatedAtDesc();
        var filtered = all.stream()
                .filter(a -> action == null || action.isBlank()
                        || a.getAction().equalsIgnoreCase(action))
                .toList();
        List<Map<String, Object>> logs = filtered.stream()
                .limit(Math.min(size, 200))
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId().toString());
                    m.put("action", a.getAction());
                    m.put("resourceType", a.getResourceType());
                    m.put("actor", a.getActor());
                    m.put("details", a.getDetails());
                    m.put("createdAt", a.getCreatedAt().toString());
                    return m;
                }).toList();
        return Map.of("content", logs, "totalElements", filtered.size());
    }

    // ---------- organizations ----------

    @GetMapping("/organizations")
    public List<Map<String, Object>> organizations() {
        Map<String, List<User>> byOrg = new TreeMap<>();
        for (User u : userRepo.findAll()) {
            String org = u.getOrganization() != null ? u.getOrganization() : "Independent";
            byOrg.computeIfAbsent(org, k -> new ArrayList<>()).add(u);
        }
        return byOrg.entrySet().stream()
                .map(e -> Map.<String, Object>of(
                        "name", e.getKey(),
                        "members", e.getValue().size(),
                        "roles", e.getValue().stream().map(User::getRole).distinct().toList()))
                .toList();
    }

    // ---------- stats ----------

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Long> byRole = new LinkedHashMap<>();
        for (String role : List.of("VICTIM", "COUNSELOR", "CASE_OFFICER", "ADMIN")) {
            byRole.put(role, userRepo.findAll().stream().filter(u -> role.equals(u.getRole())).count());
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("usersByRole", byRole);
        out.put("totalUsers", userRepo.count());
        out.put("totalCases", caseRepo.count());
        out.put("totalAlerts", alertRepo.count());
        out.put("totalRiskAssessments", riskRepo.count());
        return out;
    }
}
