package com.synora.backend.monitoring;

import com.synora.backend.casehub.Case;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A victim-submitted check-in (text and/or voice and/or behavioral context).
 */
@Entity
@Table(name = "checkins")
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseRef;

    @Column(nullable = false, length = 32)
    private String channel; // TEXT | VOICE | MIXED

    @Column(length = 8192)
    private String textContent;

    @Column(name = "voice_file_name", length = 255)
    private String voiceFileName;

    @Column(name = "voice_content_type", length = 96)
    private String voiceContentType;

    @Column(name = "voice_duration_sec")
    private Integer voiceDurationSec;

    @Column(name = "self_reported_mood", length = 32)
    private String selfReportedMood;

    @Column(name = "interaction_frequency_delta")
    private Double interactionFrequencyDelta;

    @Column(name = "response_interval_delta")
    private Double responseIntervalDelta;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public void setCreatedAt(Instant t) { this.createdAt = t; }
    public UUID getId() { return id; }
    public Case getCaseRef() { return caseRef; }
    public void setCaseRef(Case caseRef) { this.caseRef = caseRef; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getTextContent() { return textContent; }
    public void setTextContent(String textContent) { this.textContent = textContent; }
    public String getVoiceFileName() { return voiceFileName; }
    public void setVoiceFileName(String voiceFileName) { this.voiceFileName = voiceFileName; }
    public String getVoiceContentType() { return voiceContentType; }
    public void setVoiceContentType(String voiceContentType) { this.voiceContentType = voiceContentType; }
    public Integer getVoiceDurationSec() { return voiceDurationSec; }
    public void setVoiceDurationSec(Integer voiceDurationSec) { this.voiceDurationSec = voiceDurationSec; }
    public String getSelfReportedMood() { return selfReportedMood; }
    public void setSelfReportedMood(String selfReportedMood) { this.selfReportedMood = selfReportedMood; }
    public Double getInteractionFrequencyDelta() { return interactionFrequencyDelta; }
    public void setInteractionFrequencyDelta(Double v) { this.interactionFrequencyDelta = v; }
    public Double getResponseIntervalDelta() { return responseIntervalDelta; }
    public void setResponseIntervalDelta(Double v) { this.responseIntervalDelta = v; }
    public Instant getCreatedAt() { return createdAt; }
}
