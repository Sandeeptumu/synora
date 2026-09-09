package com.synora.backend.auth;

import com.synora.backend.audit.AuditService;
import com.synora.backend.security.JwtService;
import com.synora.backend.exception.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class ExternalAuthController {
    private final FirebaseIdentityVerifier verifier;
    private final ExternalAccountService accounts;
    private final JwtService jwt;
    private final AuditService audit;
    public ExternalAuthController(FirebaseIdentityVerifier verifier, ExternalAccountService accounts,
                                  JwtService jwt, AuditService audit) {
        this.verifier = verifier; this.accounts = accounts; this.jwt = jwt; this.audit = audit;
    }
    public record FirebaseRequest(@NotBlank @Size(max = 16000) String idToken, @Size(max = 120) String fullName) {}

    @GetMapping("providers")
    public Map<String, Boolean> providers() { return Map.of("firebase", verifier.isConfigured()); }

    @PostMapping("firebase")
    public AuthController.AuthResponse signIn(@Valid @RequestBody FirebaseRequest request) {
        var identity = verifier.verify(request.idToken());
        try {
            var user = accounts.signIn(identity, request.fullName());
            String token = jwt.generate(user.getId().toString(), user.getRole(), user.getId().toString());
            audit.log("LOGIN", "USER", "Verified " + identity.provider() + " sign-in");
            return new AuthController.AuthResponse(token, user.getRole(), user.getId(), user.getFullName(), user.getEmail(), user.getPhone());
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "Account setup overlapped another request. Please sign in again.");
        }
    }
}
