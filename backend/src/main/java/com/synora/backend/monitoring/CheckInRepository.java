package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CheckInRepository extends JpaRepository<CheckIn, UUID> {
    List<CheckIn> findByCaseRefIdOrderByCreatedAtDesc(UUID caseId);
    List<CheckIn> findByCaseRefIdOrderByCreatedAtAsc(UUID caseId);
}
