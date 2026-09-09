package com.synora.backend.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByDetailsContainingIgnoreCaseOrderByCreatedAtAsc(String fragment);
    List<AuditLog> findTop200ByOrderByCreatedAtDesc();
}
