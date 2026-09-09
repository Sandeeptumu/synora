package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Explicit consent record for an analysis modality.
 */
@Entity
@Table(name = "consents")
public class Consent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private com.synora.backend.user.User user;

    @Column(nullable = false, length = 32)
    private String modality; // TEXT_ANALYSIS | VOICE_ANALYSIS | BEHAVIORAL_ANALYSIS

    @Column(nullable = false)
    private boolean granted;

    @Column(name = "granted_at")
    private Instant grantedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public com.synora.backend.user.User getUser() { return user; }
    public void setUser(com.synora.backend.user.User u) { this.user = u; }
    public String getModality() { return modality; }
    public void setModality(String m) { this.modality = m; }
    public boolean isGranted() { return granted; }
    public void setGranted(boolean g) { this.granted = g; }
    public Instant getGrantedAt() { return grantedAt; }
    public void setGrantedAt(Instant t) { this.grantedAt = t; }
    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant t) { this.revokedAt = t; }
    public Instant getCreatedAt() { return createdAt; }
}
