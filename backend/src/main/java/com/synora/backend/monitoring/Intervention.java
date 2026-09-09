package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A counselor-recorded intervention / support activity on a case.
 */
@Entity
@Table(name = "interventions")
public class Intervention {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private com.synora.backend.casehub.Case caseRef;

    @Column(name = "counselor_email", nullable = false, length = 180)
    private String counselorEmail;

    @Column(nullable = false, length = 32)
    private String type; // COUNSELING_SESSION | SUPPORT_CALL | SAFETY_PLAN | REFERRAL | OTHER

    @Column(nullable = false, length = 4096)
    private String notes;

    @Column(name = "outcome", length = 255)
    private String outcome;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public com.synora.backend.casehub.Case getCaseRef() { return caseRef; }
    public void setCaseRef(com.synora.backend.casehub.Case c) { this.caseRef = c; }
    public String getCounselorEmail() { return counselorEmail; }
    public void setCounselorEmail(String e) { this.counselorEmail = e; }
    public String getType() { return type; }
    public void setType(String t) { this.type = t; }
    public String getNotes() { return notes; }
    public void setNotes(String n) { this.notes = n; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String o) { this.outcome = o; }
    public Instant getCreatedAt() { return createdAt; }
}
