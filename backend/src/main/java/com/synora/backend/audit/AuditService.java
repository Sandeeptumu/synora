package com.synora.backend.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Records security-relevant actions into the audit_logs table.
 * Never logs sensitive payload contents.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository repo;
    private final ObjectMapper om;

    public AuditService(AuditLogRepository repo, ObjectMapper om) {
        this.repo = repo;
        this.om = om;
    }

    public void log(String action, String details) {
        log(action, null, details);
    }

    public void log(String action, String resourceType, String details) {
        try {
            AuditLog entry = new AuditLog();
            entry.setAction(action);
            entry.setResourceType(resourceType);
            entry.setActor(CurrentUsername.get());
            entry.setDetails(details);
            entry.setCreatedAt(Instant.now());
            repo.save(entry);
        } catch (Exception e) {
            log.warn("Failed to persist audit log for {}: {}", action, e.toString());
        }
    }

    public void logWithPayload(String action, String resourceType, Map<String, ?> payload) {
        try {
            String details = om.writeValueAsString(payload);
            log(action, resourceType, details);
        } catch (Exception e) {
            log(action, resourceType, String.valueOf(payload));
        }
    }

    /** Reads the actor from the security context (or anonymous for login attempts). */
    private static final class CurrentUsername {
        static String get() {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            return auth != null ? auth.getName() : "anonymous";
        }
    }
}
