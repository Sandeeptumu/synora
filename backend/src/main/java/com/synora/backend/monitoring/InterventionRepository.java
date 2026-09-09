package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InterventionRepository extends JpaRepository<Intervention, UUID> {
    List<Intervention> findByCaseRefIdOrderByCreatedAtDesc(UUID caseId);
}
