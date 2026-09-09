package com.synora.backend.user;

import com.synora.backend.audit.AuditService;
import com.synora.backend.exception.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {

    public static final Set<String> ROLES = Set.of("VICTIM", "COUNSELOR", "CASE_OFFICER", "ADMIN");

    private final UserRepository repo;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public UserService(UserRepository repo, PasswordEncoder encoder, AuditService audit) {
        this.repo = repo;
        this.encoder = encoder;
        this.audit = audit;
    }

    @Transactional
    public User register(String email, String rawPassword, String role, String fullName,
                         String phone, String organization, String specialisation,
                         List<String> languageCodes, String primaryLanguage,
                         List<String> specialisations) {
        String normEmail = email.trim().toLowerCase(Locale.ROOT);
        if (!ROLES.contains(role)) {
            throw ApiException.badRequest("Invalid role: " + role);
        }
        if (repo.existsByEmailIgnoreCase(normEmail)) {
            throw ApiException.badRequest("An account with this email already exists");
        }
        User u = new User();
        u.setEmail(normEmail);
        u.setPasswordHash(encoder.encode(rawPassword));
        u.setRole(role);
        u.setFullName(fullName);
        u.setPhone(phone);
        u.setOrganization(organization);
        u.setSpecialisation(specialisation);
        u.setLanguageCodes(languageCodes);
        u.setPrimaryLanguage(primaryLanguage);
        u.setSpecialisations(specialisations);
        User saved = repo.save(u);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", saved.getId());
        payload.put("role", role);
        audit.log("USER_REGISTERED", "USER", "Registered " + role);
        return saved;
    }

    @Transactional(readOnly = true)
    public User verifyCredentials(String email, String rawPassword) {
        User u = repo.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        if (!u.isActive()) {
            throw ApiException.unauthorized("Account is deactivated");
        }
        if (u.getPasswordHash() == null || !encoder.matches(rawPassword, u.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        return u;
    }

    @Transactional(readOnly = true)
    public java.util.List<User> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public User require(UUID id) {
        return repo.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
    }

    @Transactional(readOnly = true)
    public User requireByEmail(String email) {
        return repo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    @Transactional
    public User setActive(UUID id, boolean active) {
        User u = require(id);
        u.setActive(active);
        audit.log("USER_UPDATED", "USER", "Set active=" + active);
        return u;
    }

    @Transactional
    public User updateProfile(UUID id, String fullName, String phone) {
        User u = require(id);
        if (fullName != null && !fullName.isBlank()) u.setFullName(fullName.trim());
        if (phone != null) u.setPhone(phone.trim());
        audit.log("USER_UPDATED", "USER", "Profile updated");
        return u;
    }

    @Transactional
    public User setLanguageCodes(UUID id, List<String> codes) {
        User u = require(id);
        u.setLanguageCodes(codes);
        audit.log("USER_UPDATED", "USER", "Languages updated");
        return u;
    }

    @Transactional
    public User setPrimaryLanguage(UUID id, String primaryLanguage) {
        User u = require(id);
        u.setPrimaryLanguage(primaryLanguage);
        audit.log("USER_UPDATED", "USER", "Primary language updated");
        return u;
    }

    @Transactional
    public User setSpecialisations(UUID id, List<String> specialisations) {
        User u = require(id);
        u.setSpecialisations(specialisations);
        audit.log("USER_UPDATED", "USER", "Specialisations updated");
        return u;
    }

    @Transactional
    public User setLanguages(UUID id, List<String> codes, String primaryLanguage) {
        User u = require(id);
        u.setLanguageCodes(codes);
        u.setPrimaryLanguage(primaryLanguage);
        audit.log("USER_UPDATED", "USER", "Languages updated");
        return u;
    }

    @Transactional(readOnly = true)
    public User requireByPrincipal(String principal) {
        if (principal == null) throw ApiException.unauthorized("Authentication required");
        try { return require(UUID.fromString(principal)); }
        catch (IllegalArgumentException ex) { return requireByEmail(principal); }
    }

    public Instant now() {
        return Instant.now();
    }
}
