package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Alert generated when a risk indication crosses the configured threshold.
 */
@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private com.synora.backend.casehub.Case caseRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "risk_assessment_id")
    private RiskAssessment riskAssessment;

    @Column(nullable = false, length = 16)
    private String severity; // MODERATE | HIGH | CRITICAL

    @Column(nullable = false, length = 16)
    private String status; // OPEN | ACKNOWLEDGED | RESOLVED

    @Column(name = "risk_score", nullable = false)
    private double riskScore;

    @Column(name = "signals_triggered", length = 255)
    private String signalsTriggered; // CSV, e.g. TEXT,VOICE,TREND

    @Column(nullable = false)
    private boolean escalated;

    @Column(name = "acknowledged_by")
    private String acknowledgedBy;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "resolved_by")
    private String resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolution_note", length = 1024)
    private String resolutionNote;

    @Column(name = "title", length = 180)
    private String title;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public com.synora.backend.casehub.Case getCaseRef() { return caseRef; }
    public void setCaseRef(com.synora.backend.casehub.Case c) { this.caseRef = c; }
    public RiskAssessment getRiskAssessment() { return riskAssessment; }
    public void setRiskAssessment(RiskAssessment r) { this.riskAssessment = r; }
    public String getSeverity() { return severity; }
    public void setSeverity(String s) { this.severity = s; }
    public String getStatus() { return status; }
    public void setStatus(String s) { this.status = s; }
    public double getRiskScore() { return riskScore; }
    public void setRiskScore(double v) { this.riskScore = v; }
    public String getSignalsTriggered() { return signalsTriggered; }
    public void setSignalsTriggered(String s) { this.signalsTriggered = s; }
    public boolean isEscalated() { return escalated; }
    public void setEscalated(boolean b) { this.escalated = b; }
    public String getAcknowledgedBy() { return acknowledgedBy; }
    public void setAcknowledgedBy(String a) { this.acknowledgedBy = a; }
    public Instant getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(Instant t) { this.acknowledgedAt = t; }
    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String r) { this.resolvedBy = r; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant t) { this.resolvedAt = t; }
    public String getResolutionNote() { return resolutionNote; }
    public void setResolutionNote(String n) { this.resolutionNote = n; }
    public String getTitle() { return title; }
    public void setTitle(String t) { this.title = t; }
    public Instant getCreatedAt() { return createdAt; }
}
