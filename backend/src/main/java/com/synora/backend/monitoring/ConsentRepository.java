package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsentRepository extends JpaRepository<Consent, UUID> {
    List<Consent> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Consent> findFirstByUserIdAndModalityOrderByCreatedAtDesc(UUID userId, String modality);
}
