package com.synora.backend.support;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConversationLogRepository extends JpaRepository<ConversationLog, UUID> {
    List<ConversationLog> findByUserIdOrderByCreatedAtAsc(UUID userId);
    List<ConversationLog> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
