package com.synora.backend.auth;
import jakarta.persistence.*;
@Entity @Table(name="staff_invitations")
public class StaffInvitation {
 @Id @Column(length=180) private String email;
 @Column(nullable=false,length=32) private String role;
 public StaffInvitation() {}
 public StaffInvitation(String email,String role) { this.email=email; this.role=role; }
 public String getEmail() { return email; }
 public String getRole() { return role; }
}
