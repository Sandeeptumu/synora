package com.synora.backend.support;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CheckInRecordRepository extends JpaRepository<CheckInRecord, UUID> {
    Optional<CheckInRecord> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT COUNT(c) FROM CheckInRecord c WHERE c.user.id = :userId AND c.createdAt >= :start AND c.createdAt < :end")
    long countByUserIdAndDay(@Param("userId") UUID userId, @Param("start") Instant start, @Param("end") Instant end);

    List<CheckInRecord> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT c FROM CheckInRecord c WHERE c.user.id = :userId AND c.createdAt >= :start ORDER BY c.createdAt DESC")
    List<CheckInRecord> findByUserIdAndCreatedAtAfter(@Param("userId") UUID userId, @Param("start") Instant start);
}
