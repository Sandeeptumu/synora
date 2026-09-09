package com.synora.backend.support;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SupportTriageRepository extends JpaRepository<SupportTriage, UUID> {
    Optional<SupportTriage> findByUserId(UUID userId);
}
