package com.synora.backend.casehub;

import com.synora.backend.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A support case opened for a victim/complainant.
 */
@Entity
@Table(name = "cases")
public class Case {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Human-readable case number, e.g. CASE-2031. */
    @Column(nullable = false, unique = true, length = 32)
    private String caseNumber;

    @Column(name = "case_title", length = 180)
    private String title;

    @Column(length = 64)
    private String category;

    @Column(length = 32, nullable = false)
    private String status; // OPEN | IN_PROGRESS | MONITORING | CLOSED

    @Column(name = "priority_level", length = 16)
    private String priority;

    @Column(name = "district_region", length = 96)
    private String region;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "victim_user_id", nullable = false)
    private User victim;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_counselor_id")
    private User assignedCounselor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_officer_id")
    private User assignedOfficer;

    @Column(length = 512)
    private String summary;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    public UUID getId() { return id; }
    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public User getVictim() { return victim; }
    public void setVictim(User victim) { this.victim = victim; }
    public User getAssignedCounselor() { return assignedCounselor; }
    public void setAssignedCounselor(User assignedCounselor) { this.assignedCounselor = assignedCounselor; }
    public User getAssignedOfficer() { return assignedOfficer; }
    public void setAssignedOfficer(User assignedOfficer) { this.assignedOfficer = assignedOfficer; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
