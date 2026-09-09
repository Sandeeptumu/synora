package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A scheduled or completed follow-up on a case.
 */
@Entity
@Table(name = "followups")
public class FollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private com.synora.backend.casehub.Case caseRef;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, length = 16)
    private String status; // SCHEDULED | COMPLETED | MISSED | RESCHEDULED

    @Column(nullable = false, length = 32)
    private String type; // CALL | SESSION | CHECK_IN | VISIT

    @Column(length = 512)
    private String notes;

    @Column(name = "created_by", length = 180)
    private String createdBy;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    public UUID getId() { return id; }
    public com.synora.backend.casehub.Case getCaseRef() { return caseRef; }
    public void setCaseRef(com.synora.backend.casehub.Case c) { this.caseRef = c; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate d) { this.dueDate = d; }
    public String getStatus() { return status; }
    public void setStatus(String s) { this.status = s; }
    public String getType() { return type; }
    public void setType(String t) { this.type = t; }
    public String getNotes() { return notes; }
    public void setNotes(String n) { this.notes = n; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String c) { this.createdBy = c; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant t) { this.completedAt = t; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
