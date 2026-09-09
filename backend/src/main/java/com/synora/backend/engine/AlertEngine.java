package com.synora.backend.engine;

import com.synora.backend.audit.AuditService;
import com.synora.backend.config.SynoraProperties;
import com.synora.backend.monitoring.*;
import com.synora.backend.casehub.Case;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Alert engine: generates alerts when risk crosses thresholds, handles
 * acknowledge/resolve lifecycle and escalation bookkeeping.
 */
@Service
public class AlertEngine {

    private final AlertRepository alertRepo;
    private final SynoraProperties props;
    private final AuditService audit;

    public AlertEngine(AlertRepository alertRepo, SynoraProperties props, AuditService audit) {
        this.alertRepo = alertRepo;
        this.props = props;
        this.audit = audit;
    }

    /** Creates an alert if the risk score crosses the alert threshold (dedup by open alert on same case). */
    @Transactional
    public Alert maybeCreateAlert(Case c, RiskAssessment ra, List<String> signalsTriggered) {
        SynoraProperties.Risk cfg = props.risk();
        if (ra.getRiskScore() < cfg.alertThreshold()) {
            return null;
        }
        // Dedup: don't stack multiple OPEN alerts for the same case.
        List<Alert> open = alertRepo.findByCaseRefIdOrderByCreatedAtDesc(c.getId()).stream()
                .filter(a -> "OPEN".equals(a.getStatus()))
                .toList();
        if (!open.isEmpty()) {
            // Update existing open alert's severity if it rose.
            Alert existing = open.get(0);
            if (ra.getRiskScore() > existing.getRiskScore()) {
                existing.setRiskScore(ra.getRiskScore());
                existing.setSeverity(severityFor(ra.getRiskLevel()));
                existing.setRiskAssessment(ra);
                alertRepo.save(existing);
            }
            return existing;
        }

        Alert alert = new Alert();
        alert.setCaseRef(c);
        alert.setRiskAssessment(ra);
        alert.setSeverity(severityFor(ra.getRiskLevel()));
        alert.setStatus("OPEN");
        alert.setRiskScore(ra.getRiskScore());
        alert.setSignalsTriggered(String.join(",", signalsTriggered));
        alert.setTitle(severityFor(ra.getRiskLevel()) + "-RISK SIGNAL DETECTED");
        alert.setEscalated(false);
        Alert saved = alertRepo.save(alert);
        audit.log("ALERT_CREATED", "CASE",
                c.getCaseNumber() + " severity=" + saved.getSeverity() + " score=" + ra.getRiskScore());
        return saved;
    }

    public String severityFor(String riskLevel) {
        return switch (riskLevel) {
            case "CRITICAL" -> "CRITICAL";
            case "HIGH" -> "HIGH";
            default -> "MODERATE";
        };
    }

    @Transactional
    public Alert acknowledge(UUID alertId, String actorEmail) {
        Alert a = require(alertId);
        if ("OPEN".equals(a.getStatus())) {
            a.setStatus("ACKNOWLEDGED");
            a.setAcknowledgedBy(actorEmail);
            a.setAcknowledgedAt(Instant.now());
            audit.log("ALERT_ACKNOWLEDGED", "CASE",
                    a.getCaseRef().getCaseNumber() + " by " + actorEmail);
        }
        return a;
    }

    @Transactional
    public Alert resolve(UUID alertId, String actorEmail, String note) {
        Alert a = require(alertId);
        if (!"RESOLVED".equals(a.getStatus())) {
            a.setStatus("RESOLVED");
            a.setResolvedBy(actorEmail);
            a.setResolvedAt(Instant.now());
            a.setResolutionNote(note);
            audit.log("ALERT_RESOLVED", "CASE",
                    a.getCaseRef().getCaseNumber() + " by " + actorEmail);
        }
        return a;
    }

    @Transactional
    public Alert escalate(UUID alertId) {
        Alert a = require(alertId);
        a.setEscalated(true);
        audit.log("ALERT_ESCALATED", "CASE",
                a.getCaseRef().getCaseNumber() + " escalated to supervising officer");
        return a;
    }

    public Alert require(UUID id) {
        return alertRepo.findById(id).orElseThrow(
                () -> com.synora.backend.exception.ApiException.notFound("Alert not found"));
    }

    /** Scheduled sweep: escalates unacknowledged high/critical alerts after the configured timeout. */
    @Scheduled(fixedDelayString = "#{5 * 60 * 1000}", initialDelayString = "#{2 * 60 * 1000}")
    @Transactional
    public void scheduledEscalationSweep() {
        runEscalationSweep();
    }

    /** Marks high-risk OPEN alerts older than the escalation timeout as escalated. */
    @Transactional
    public int runEscalationSweep() {
        Instant cutoff = Instant.now().minus(props.alerts().escalationMinutes(), java.time.temporal.ChronoUnit.MINUTES);
        List<Alert> stale = alertRepo.findByStatusInOrderByCreatedAtDesc(List.of("OPEN")).stream()
                .filter(a -> "HIGH".equals(a.getSeverity()) || "CRITICAL".equals(a.getSeverity()))
                .filter(a -> a.getCreatedAt().isBefore(cutoff))
                .toList();
        int n = 0;
        for (Alert a : stale) {
            if (!a.isEscalated()) {
                a.setEscalated(true);
                audit.log("ALERT_ESCALATED", "CASE", a.getCaseRef().getCaseNumber());
                n++;
            }
        }
        return n;
    }
}
