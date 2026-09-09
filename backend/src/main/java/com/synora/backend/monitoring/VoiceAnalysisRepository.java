package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VoiceAnalysisRepository extends JpaRepository<VoiceAnalysis, UUID> {
    Optional<VoiceAnalysis> findByCheckInId(UUID checkInId);
}
