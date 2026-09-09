package com.synora.backend.monitoring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A counselor-reviewed support resource.
 */
@Entity
@Table(name = "resources")
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 48)
    private String category; // COUNSELING | CRISIS_SUPPORT | COMMUNITY | LEGAL | REHABILITATION | ARTICLE | SELF_CARE

    @Column(length = 1024)
    private String description;

    @Column(length = 96)
    private String availability;

    @Column(length = 96)
    private String language;

    @Column(length = 255)
    private String contact;

    @Column(length = 255)
    private String link;

    @Column(nullable = false)
    private boolean reviewed;

    /** Themes this resource is recommended for (CSV, e.g. sleep,anxiety). */
    @Column(length = 255)
    private String themes;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String t) { this.title = t; }
    public String getCategory() { return category; }
    public void setCategory(String c) { this.category = c; }
    public String getDescription() { return description; }
    public void setDescription(String d) { this.description = d; }
    public String getAvailability() { return availability; }
    public void setAvailability(String a) { this.availability = a; }
    public String getLanguage() { return language; }
    public void setLanguage(String l) { this.language = l; }
    public String getContact() { return contact; }
    public void setContact(String c) { this.contact = c; }
    public String getLink() { return link; }
    public void setLink(String l) { this.link = l; }
    public boolean isReviewed() { return reviewed; }
    public void setReviewed(boolean r) { this.reviewed = r; }
    public String getThemes() { return themes; }
    public void setThemes(String t) { this.themes = t; }
    public Instant getCreatedAt() { return createdAt; }
}
