package com.synora.backend.user;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, length = 180)
    private String email;

    @Column
    private String passwordHash;

    @Column(unique = true, length = 128)
    private String firebaseUid;

    public String getFirebaseUid() { return firebaseUid; }
    public void setFirebaseUid(String uid) { this.firebaseUid = uid; }

    @Column(nullable = false, length = 32)
    private String role; // VICTIM | COUNSELOR | CASE_OFFICER | ADMIN

    @Column(nullable = false, length = 120)
    private String fullName;

    @Column(length = 32)
    private String phone;

    @Column(nullable = false)
    private boolean active = true;

    @Column(length = 160)
    private String organization;

    @Column(length = 64)
    private String specialisation;

    /** Comma-separated language codes, e.g. en,te,hi. Stored as text for simple migration path. */
    @Column(name = "language_codes", length = 256)
    private String languageCodes;

    /** One of the stored language codes may be marked primary for UI display. */
    @Column(name = "primary_language", length = 8)
    private String primaryLanguage;

    /** Supported specialisations as a JSON list of strings (short labels). */
    @Column(name = "specialisations_json", columnDefinition = "text", length = 2000)
    private String specialisationsJson;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }
    public String getSpecialisation() { return specialisation; }
    public void setSpecialisation(String specialisation) { this.specialisation = specialisation; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<String> getLanguageCodes() {
        if (languageCodes == null || languageCodes.isBlank()) return List.of();
        return Arrays.stream(languageCodes.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public void setLanguageCodes(List<String> codes) {
        this.languageCodes = codes == null ? null : String.join(",", codes.stream().map(String::toLowerCase).toList());
    }

    public String getPrimaryLanguage() { return primaryLanguage; }
    public void setPrimaryLanguage(String primaryLanguage) { this.primaryLanguage = primaryLanguage; }

    public List<String> getSpecialisations() {
        if (specialisationsJson == null || specialisationsJson.isBlank()) return List.of();
        try {
            return com.synora.backend.util.JsonUtils.toList(specialisationsJson, String.class);
        } catch (Exception e) {
            return List.of();
        }
    }

    public void setSpecialisations(List<String> specialisations) {
        this.specialisationsJson = com.synora.backend.util.JsonUtils.toJson(specialisations);
    }
}
