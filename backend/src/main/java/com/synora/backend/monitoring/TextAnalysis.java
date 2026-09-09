package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Stored result of AI text analysis for a check-in.
 */
@Entity
@Table(name = "text_analysis")
public class TextAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "checkin_id", nullable = false)
    private CheckIn checkIn;

    @Column(name = "distress_score", nullable = false)
    private double distressScore;

    @Column(nullable = false, length = 16)
    private String sentiment;

    @Column(length = 1024)
    private String themes; // CSV

    @Column(name = "emotional_indicators", length = 1024)
    private String emotionalIndicators; // CSV

    @Column(name = "sleep_disruption", nullable = false)
    private boolean sleepDisruption;

    @Column(nullable = false)
    private boolean urgency;

    @Column(length = 255)
    private String urgencyNote;

    @Column(nullable = false)
    private double confidence;

    @Column(name = "provider", length = 64)
    private String provider;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public void setCreatedAt(Instant t) { this.createdAt = t; }
    public UUID getId() { return id; }
    public CheckIn getCheckIn() { return checkIn; }
    public void setCheckIn(CheckIn c) { this.checkIn = c; }
    public double getDistressScore() { return distressScore; }
    public void setDistressScore(double v) { this.distressScore = v; }
    public String getSentiment() { return sentiment; }
    public void setSentiment(String s) { this.sentiment = s; }
    public String getThemes() { return themes; }
    public void setThemes(String t) { this.themes = t; }
    public String getEmotionalIndicators() { return emotionalIndicators; }
    public void setEmotionalIndicators(String e) { this.emotionalIndicators = e; }
    public boolean isSleepDisruption() { return sleepDisruption; }
    public void setSleepDisruption(boolean b) { this.sleepDisruption = b; }
    public boolean isUrgency() { return urgency; }
    public void setUrgency(boolean b) { this.urgency = b; }
    public String getUrgencyNote() { return urgencyNote; }
    public void setUrgencyNote(String n) { this.urgencyNote = n; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double v) { this.confidence = v; }
    public String getProvider() { return provider; }
    public void setProvider(String p) { this.provider = p; }
    public Instant getCreatedAt() { return createdAt; }
}
