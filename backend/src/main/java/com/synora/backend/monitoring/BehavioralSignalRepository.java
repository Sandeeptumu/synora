package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BehavioralSignalRepository extends JpaRepository<BehavioralSignal, UUID> {
    List<BehavioralSignal> findByCaseRefIdOrderByCreatedAtDesc(UUID caseId);
}
