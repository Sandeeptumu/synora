package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Behavioral signals computed from permitted interaction metadata only.
 */
@Entity
@Table(name = "behavioral_signals")
public class BehavioralSignal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private com.synora.backend.casehub.Case caseRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checkin_id")
    private CheckIn checkIn;

    @Column(name = "interaction_frequency", nullable = false)
    private double interactionFrequency;

    @Column(name = "response_interval_hours", nullable = false)
    private double responseIntervalHours;

    @Column(name = "baseline_interaction_frequency", nullable = false)
    private double baselineInteractionFrequency;

    @Column(name = "baseline_response_interval_hours", nullable = false)
    private double baselineResponseIntervalHours;

    @Column(nullable = false)
    private double deviation;

    @Column(name = "indicators", length = 512)
    private String indicators; // CSV

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public void setCreatedAt(Instant t) { this.createdAt = t; }
    public UUID getId() { return id; }
    public com.synora.backend.casehub.Case getCaseRef() { return caseRef; }
    public void setCaseRef(com.synora.backend.casehub.Case c) { this.caseRef = c; }
    public CheckIn getCheckIn() { return checkIn; }
    public void setCheckIn(CheckIn c) { this.checkIn = c; }
    public double getInteractionFrequency() { return interactionFrequency; }
    public void setInteractionFrequency(double v) { this.interactionFrequency = v; }
    public double getResponseIntervalHours() { return responseIntervalHours; }
    public void setResponseIntervalHours(double v) { this.responseIntervalHours = v; }
    public double getBaselineInteractionFrequency() { return baselineInteractionFrequency; }
    public void setBaselineInteractionFrequency(double v) { this.baselineInteractionFrequency = v; }
    public double getBaselineResponseIntervalHours() { return baselineResponseIntervalHours; }
    public void setBaselineResponseIntervalHours(double v) { this.baselineResponseIntervalHours = v; }
    public double getDeviation() { return deviation; }
    public void setDeviation(double v) { this.deviation = v; }
    public String getIndicators() { return indicators; }
    public void setIndicators(String indicators) { this.indicators = indicators; }
    public Instant getCreatedAt() { return createdAt; }
}
