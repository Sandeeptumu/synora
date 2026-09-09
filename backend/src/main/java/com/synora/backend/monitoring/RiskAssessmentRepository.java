package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RiskAssessmentRepository extends JpaRepository<RiskAssessment, UUID> {
    List<RiskAssessment> findByCaseRefIdOrderByCreatedAtAsc(UUID caseId);
    List<RiskAssessment> findByCaseRefIdOrderByCreatedAtDesc(UUID caseId);
    Optional<RiskAssessment> findFirstByCaseRefIdOrderByCreatedAtDesc(UUID caseId);
}
