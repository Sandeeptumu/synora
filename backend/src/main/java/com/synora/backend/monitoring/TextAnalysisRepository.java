package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TextAnalysisRepository extends JpaRepository<TextAnalysis, UUID> {
    Optional<TextAnalysis> findByCheckInId(UUID checkInId);
}
