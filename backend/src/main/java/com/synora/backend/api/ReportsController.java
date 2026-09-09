package com.synora.backend.api;

import com.synora.backend.casehub.Case;
import com.synora.backend.casehub.CaseRepository;
import com.synora.backend.monitoring.AlertRepository;
import com.synora.backend.monitoring.FollowUpRepository;
import com.synora.backend.monitoring.RiskAssessment;
import com.synora.backend.monitoring.RiskAssessmentRepository;
import com.synora.backend.user.User;
import com.synora.backend.user.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Aggregated, anonymized reporting endpoints. Never exposes individual victim data.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportsController {

    private final CaseRepository caseRepo;
    private final RiskAssessmentRepository riskRepo;
    private final AlertRepository alertRepo;
    private final FollowUpRepository followUpRepo;
    private final UserRepository userRepo;

    public ReportsController(CaseRepository caseRepo, RiskAssessmentRepository riskRepo,
                             AlertRepository alertRepo, FollowUpRepository followUpRepo,
                             UserRepository userRepo) {
        this.caseRepo = caseRepo;
        this.riskRepo = riskRepo;
        this.alertRepo = alertRepo;
        this.followUpRepo = followUpRepo;
        this.userRepo = userRepo;
    }

    /** Latest risk assessment per case, keyed by case id. */
    private Map<UUID, RiskAssessment> latestByCase() {
        Map<UUID, RiskAssessment> latest = new HashMap<>();
        for (RiskAssessment ra : riskRepo.findAll()) {
            latest.merge(ra.getCaseRef().getId(), ra, (a, b) ->
                    a.getCreatedAt().isAfter(b.getCreatedAt()) ? a : b);
        }
        return latest;
    }

    @GetMapping("/overview")
    public Map<String, Object> overview(@RequestParam(defaultValue = "30") int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        Map<UUID, RiskAssessment> latest = latestByCase();

        // Risk distribution (anonymized counts only)
        Map<String, Long> distribution = latest.values().stream()
                .collect(Collectors.groupingBy(RiskAssessment::getRiskLevel, Collectors.counting()));
        Map<String, Long> dist = new LinkedHashMap<>();
        for (String level : List.of("LOW", "MODERATE", "HIGH", "CRITICAL")) {
            dist.put(level, distribution.getOrDefault(level, 0L));
        }

        // Cases created per day
        Map<String, Long> casesOverTime = new TreeMap<>();
        for (Case c : caseRepo.findAll()) {
            if (c.getCreatedAt().isAfter(since)) {
                String day = c.getCreatedAt().toString().substring(0, 10);
                casesOverTime.merge(day, 1L, Long::sum);
            }
        }

        // Alerts
        long openAlerts = alertRepo.countByStatus("OPEN");
        long ackAlerts = alertRepo.countByStatus("ACKNOWLEDGED");
        long resolvedAlerts = alertRepo.countByStatus("RESOLVED");

        double avgResolutionHours = alertRepo.findByStatusInOrderByCreatedAtDesc(List.of("RESOLVED")).stream()
                .filter(a -> a.getResolvedAt() != null)
                .mapToLong(a -> ChronoUnit.HOURS.between(a.getCreatedAt(), a.getResolvedAt()))
                .average().orElse(0);

        // Follow-up completion
        long scheduled = followUpRepo.findByStatusOrderByDueDateAsc("SCHEDULED").size();
        long completed = followUpRepo.findByStatusOrderByDueDateAsc("COMPLETED").size();
        long missed = followUpRepo.findByStatusOrderByDueDateAsc("MISSED").size();

        // Case status breakdown
        Map<String, Long> caseStatus = new LinkedHashMap<>();
        for (String st : List.of("OPEN", "IN_PROGRESS", "MONITORING", "CLOSED")) {
            caseStatus.put(st, caseRepo.countByStatus(st));
        }

        // Anonymized regional trend (counts only)
        Map<String, Long> regions = new TreeMap<>();
        for (Case c : caseRepo.findAll()) {
            if (c.getRegion() != null) {
                regions.merge(c.getRegion(), 1L, Long::sum);
            }
        }

        // Average risk trend over time (weekly buckets, anonymized)
        Map<String, Double> riskTrend = new TreeMap<>();
        Map<String, List<Double>> buckets = new HashMap<>();
        for (RiskAssessment ra : riskRepo.findAll()) {
            if (ra.getCreatedAt().isAfter(since)) {
                String week = ra.getCreatedAt().toString().substring(0, 10);
                buckets.computeIfAbsent(week, k -> new ArrayList<>()).add(ra.getRiskScore());
            }
        }
        for (var e : buckets.entrySet()) {
            riskTrend.put(e.getKey(),
                    Math.round(e.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0) * 100.0) / 100.0);
        }

        long totalCases = caseRepo.count();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalCases", totalCases);
        out.put("activeCases", caseRepo.countByStatus("OPEN") + caseRepo.countByStatus("IN_PROGRESS")
                + caseRepo.countByStatus("MONITORING"));
        out.put("riskDistribution", dist);
        out.put("casesOverTime", casesOverTime);
        out.put("alerts", Map.of(
                "open", openAlerts,
                "acknowledged", ackAlerts,
                "resolved", resolvedAlerts,
                "avgResolutionHours", Math.round(avgResolutionHours * 10.0) / 10.0));
        out.put("followUps", Map.of(
                "scheduled", scheduled,
                "completed", completed,
                "missed", missed,
                "completionRate", (completed + missed) > 0
                        ? Math.round(completed * 100.0 / (completed + missed)) : 100));
        out.put("caseStatus", caseStatus);
        out.put("regionalDistribution", regions);
        out.put("avgRiskTrend", riskTrend);
        out.put("anonymized", true);
        out.put("note", "All aggregates are anonymized. Individual victim data is never included.");
        return out;
    }
}
