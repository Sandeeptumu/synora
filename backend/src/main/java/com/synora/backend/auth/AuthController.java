package com.synora.backend.auth;

import com.synora.backend.audit.AuditService;
import com.synora.backend.security.JwtService;
import com.synora.backend.user.User;
import com.synora.backend.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Authentication endpoints: register + login, returns JWT with role claim.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final AuditService audit;
    private final StaffInvitationRepository invitations;

    public AuthController(UserService userService, JwtService jwtService, AuditService audit, StaffInvitationRepository invitations) {
        this.invitations = invitations;
        this.userService = userService;
        this.jwtService = jwtService;
        this.audit = audit;
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 180) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            String role,
            @NotBlank @Size(min = 2, max = 120) String fullName,
            String phone,
            String organization,
            String specialisation) {}

    public record LoginRequest(@NotBlank @Email @Size(max = 180) String email, @NotBlank String password) {}

    public record AuthResponse(String token, String role, UUID userId, String fullName, String email, String phone) {}

    @PostMapping("/register")
    @org.springframework.transaction.annotation.Transactional
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        if (invitations.existsById(req.email().trim().toLowerCase(java.util.Locale.ROOT)))
            throw com.synora.backend.exception.ApiException.badRequest("Staff access is reserved for this email. Continue with Google to verify it.");
        User u = userService.register(req.email(), req.password(), "VICTIM",
                req.fullName(), null, null, null, List.of(), null, List.of());
        String token = jwtService.generate(u.getId().toString(), u.getRole(), u.getId().toString());
        audit.log("LOGIN", "USER", "Registered and logged in as " + u.getRole());
        return new AuthResponse(token, u.getRole(), u.getId(), u.getFullName(), u.getEmail(), u.getPhone());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        User u = userService.verifyCredentials(req.email(), req.password());
        String token = jwtService.generate(u.getId().toString(), u.getRole(), u.getId().toString());
        audit.log("LOGIN", "USER", "Logged in");
        return new AuthResponse(token, u.getRole(), u.getId(), u.getFullName(), u.getEmail(), u.getPhone());
    }
}
