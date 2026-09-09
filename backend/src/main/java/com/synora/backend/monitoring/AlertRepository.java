package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID> {
    List<Alert> findByCaseRefIdOrderByCreatedAtDesc(UUID caseId);
    List<Alert> findByStatusOrderByCreatedAtDesc(String status);
    List<Alert> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
    long countByStatus(String status);
}
