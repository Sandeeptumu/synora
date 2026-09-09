package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface FollowUpRepository extends JpaRepository<FollowUp, UUID> {
    List<FollowUp> findByCaseRefIdOrderByDueDateAsc(UUID caseId);
    List<FollowUp> findByStatusOrderByDueDateAsc(String status);
    List<FollowUp> findByDueDateBetweenOrderByDueDateAsc(LocalDate start, LocalDate end);
    long countByStatusAndDueDateLessThanEqual(String status, LocalDate date);
}
