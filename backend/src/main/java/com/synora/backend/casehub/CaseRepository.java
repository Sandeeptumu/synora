package com.synora.backend.casehub;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CaseRepository extends JpaRepository<Case, UUID> {

    Optional<Case> findByCaseNumberIgnoreCase(String caseNumber);

    List<Case> findByVictimIdOrderByCreatedAtDesc(UUID victimId);

    List<Case> findByAssignedCounselorIdOrderByCreatedAtDesc(UUID counselorId);

    List<Case> findByAssignedOfficerIdOrderByCreatedAtDesc(UUID officerId);

    @Query("select c from Case c where c.assignedCounselor.id = :uid or c.assignedOfficer.id = :uid")
    List<Case> findAssignedTo(@Param("uid") UUID uid);

    long countByStatus(String status);
}
