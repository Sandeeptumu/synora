package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Stored result of AI voice analysis for a check-in.
 */
@Entity
@Table(name = "voice_analysis")
public class VoiceAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "checkin_id", nullable = false)
    private CheckIn checkIn;

    @Column(name = "distress_score", nullable = false)
    private double distressScore;

    @Column(name = "tone_indicators", length = 512)
    private String toneIndicators; // CSV

    @Column(name = "energy_level", nullable = false)
    private double energyLevel;

    @Column(name = "speech_rate", nullable = false)
    private double speechRate;

    @Column(nullable = false)
    private double confidence;

    @Column(length = 64, nullable = false)
    private String provider;

    @Column(name = "transcribed_snippet", length = 1024)
    private String transcribedSnippet;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public void setCreatedAt(Instant t) { this.createdAt = t; }
    public UUID getId() { return id; }
    public CheckIn getCheckIn() { return checkIn; }
    public void setCheckIn(CheckIn c) { this.checkIn = c; }
    public double getDistressScore() { return distressScore; }
    public void setDistressScore(double v) { this.distressScore = v; }
    public String getToneIndicators() { return toneIndicators; }
    public void setToneIndicators(String t) { this.toneIndicators = t; }
    public double getEnergyLevel() { return energyLevel; }
    public void setEnergyLevel(double v) { this.energyLevel = v; }
    public double getSpeechRate() { return speechRate; }
    public void setSpeechRate(double v) { this.speechRate = v; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double v) { this.confidence = v; }
    public String getProvider() { return provider; }
    public void setProvider(String p) { this.provider = p; }
    public String getTranscribedSnippet() { return transcribedSnippet; }
    public void setTranscribedSnippet(String s) { this.transcribedSnippet = s; }
    public Instant getCreatedAt() { return createdAt; }
}
