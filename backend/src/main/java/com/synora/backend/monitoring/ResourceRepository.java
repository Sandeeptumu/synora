package com.synora.backend.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ResourceRepository extends JpaRepository<Resource, UUID> {
    List<Resource> findByCategoryIgnoreCase(String category);
    List<Resource> findByReviewedTrue();
}
