package com.synora.backend.support;

import com.synora.backend.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "support_triage")
public class SupportTriage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "primary_concern", length = 128)
    private String primaryConcern;

    @Column(name = "concern_areas_json", columnDefinition = "text", length = 2000)
    private String concernAreasJson;

    @Column(length = 16)
    private String riskLevel;

    @Column(name = "suggested_support", length = 256)
    private String suggestedSupport;

    @Column(name = "match_summary_json", columnDefinition = "text", length = 2000)
    private String matchSummaryJson;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getPrimaryConcern() { return primaryConcern; }
    public void setPrimaryConcern(String primaryConcern) { this.primaryConcern = primaryConcern; }
    public String getConcernAreasJson() { return concernAreasJson; }
    public void setConcernAreasJson(String concernAreasJson) { this.concernAreasJson = concernAreasJson; }
    public List<String> getConcernAreas() {
        if (concernAreasJson == null || concernAreasJson.isBlank()) return List.of();
        try {
            return com.synora.backend.util.JsonUtils.toList(concernAreasJson, String.class);
        } catch (Exception e) {
            return List.of();
        }
    }
    public void setConcernAreas(List<String> areas) {
        this.concernAreasJson = com.synora.backend.util.JsonUtils.toJson(areas);
    }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public String getSuggestedSupport() { return suggestedSupport; }
    public void setSuggestedSupport(String suggestedSupport) { this.suggestedSupport = suggestedSupport; }
    public String getMatchSummaryJson() { return matchSummaryJson; }
    public void setMatchSummaryJson(String matchSummaryJson) { this.matchSummaryJson = matchSummaryJson; }
    public List<String> getMatchSummary() {
        if (matchSummaryJson == null || matchSummaryJson.isBlank()) return List.of();
        try {
            return com.synora.backend.util.JsonUtils.toList(matchSummaryJson, String.class);
        } catch (Exception e) {
            return List.of();
        }
    }
    public void setMatchSummary(List<String> summary) {
        this.matchSummaryJson = com.synora.backend.util.JsonUtils.toJson(summary);
    }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
