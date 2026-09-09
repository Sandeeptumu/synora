package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A stored risk indication produced by the risk engine.
 */
@Entity
@Table(name = "risk_assessments")
public class RiskAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private com.synora.backend.casehub.Case caseRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checkin_id")
    private CheckIn checkIn;

    @Column(name = "risk_score", nullable = false)
    private double riskScore;

    @Column(name = "risk_level", nullable = false, length = 16)
    private String riskLevel; // LOW | MODERATE | HIGH | CRITICAL

    @Column(nullable = false, length = 16)
    private String trend; // STABLE | RISING | DECLINING | VOLATILE

    @Column(name = "text_score")
    private Double textScore;

    @Column(name = "voice_score")
    private Double voiceScore;

    @Column(name = "behavior_score")
    private Double behaviorScore;

    @Column(name = "baseline_deviation")
    private Double baselineDeviation;

    @Column(name = "temporal_score")
    private Double temporalScore;

    @Column(name = "cross_modal_agreement")
    private Double crossModalAgreement;

    @Column(name = "signal_agreement")
    private Double signalAgreement;

    @Column(name = "consistency_flag", length = 32)
    private String consistencyFlag;

    @Column(name = "provider", length = 64)
    private String provider;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public void setCreatedAt(Instant t) { this.createdAt = t; }
    public UUID getId() { return id; }
    public com.synora.backend.casehub.Case getCaseRef() { return caseRef; }
    public void setCaseRef(com.synora.backend.casehub.Case c) { this.caseRef = c; }
    public CheckIn getCheckIn() { return checkIn; }
    public void setCheckIn(CheckIn c) { this.checkIn = c; }
    public double getRiskScore() { return riskScore; }
    public void setRiskScore(double v) { this.riskScore = v; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String v) { this.riskLevel = v; }
    public String getTrend() { return trend; }
    public void setTrend(String v) { this.trend = v; }
    public Double getTextScore() { return textScore; }
    public void setTextScore(Double v) { this.textScore = v; }
    public Double getVoiceScore() { return voiceScore; }
    public void setVoiceScore(Double v) { this.voiceScore = v; }
    public Double getBehaviorScore() { return behaviorScore; }
    public void setBehaviorScore(Double v) { this.behaviorScore = v; }
    public Double getBaselineDeviation() { return baselineDeviation; }
    public void setBaselineDeviation(Double v) { this.baselineDeviation = v; }
    public Double getTemporalScore() { return temporalScore; }
    public void setTemporalScore(Double v) { this.temporalScore = v; }
    public Double getCrossModalAgreement() { return crossModalAgreement; }
    public void setCrossModalAgreement(Double v) { this.crossModalAgreement = v; }
    public Double getSignalAgreement() { return signalAgreement; }
    public void setSignalAgreement(Double v) { this.signalAgreement = v; }
    public String getConsistencyFlag() { return consistencyFlag; }
    public void setConsistencyFlag(String v) { this.consistencyFlag = v; }
    public String getProvider() { return provider; }
    public void setProvider(String v) { this.provider = v; }
    public Instant getCreatedAt() { return createdAt; }
}
