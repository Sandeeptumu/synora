package com.synora.backend.monitoring;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.*;
public interface VoiceRecordingRepository extends JpaRepository<VoiceRecording,UUID> {
 @Query("select v.id from VoiceRecording v where v.checkIn.caseRef.id = :caseId")
 List<UUID> recordingIds(UUID caseId);
}
