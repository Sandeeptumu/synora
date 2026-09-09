package com.synora.backend.monitoring;
import jakarta.persistence.*;
import java.util.UUID;
@Entity
@Table(name="voice_recordings")
public class VoiceRecording {
 @Id private UUID id;
 @OneToOne(fetch=FetchType.LAZY, optional=false) @MapsId
 @JoinColumn(name="checkin_id") private CheckIn checkIn;
 @Column(nullable=false, columnDefinition="bytea") private byte[] audio;
 @Column(nullable=false, length=96) private String contentType;
 public VoiceRecording() {}
 public VoiceRecording(CheckIn ci, byte[] bytes, String type) { checkIn=ci; audio=bytes; contentType=type; }
 public CheckIn getCheckIn() { return checkIn; }
 public byte[] getAudio() { return audio; }
 public String getContentType() { return contentType; }
}
