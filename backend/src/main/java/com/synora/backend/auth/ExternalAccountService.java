package com.synora.backend.auth;

import com.synora.backend.user.User;
import com.synora.backend.user.UserRepository;
import com.synora.backend.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;

@Service
public class ExternalAccountService {
    private final UserRepository users;
    private final StaffInvitationRepository invitations;
    public ExternalAccountService(UserRepository users, StaffInvitationRepository invitations) { this.users = users; this.invitations = invitations; }

    @Transactional
    public User signIn(FirebaseIdentityVerifier.Identity identity, String fullName) {
        var existing = users.findByFirebaseUid(identity.uid());
        if (existing.isPresent()) {
            User user = existing.get();
            if (!user.isActive()) throw ApiException.unauthorized("Account is deactivated");
            return user; // Preserve database role; never accept a role from client or provider claims.
        }
        String email = identity.email() == null ? null : identity.email().trim().toLowerCase(Locale.ROOT);
        // Do not silently merge accounts by an email or an editable contact phone number.
        if (email != null && users.existsByEmailIgnoreCase(email))
            throw new ApiException(HttpStatus.CONFLICT,
                    "An account already uses this email. Sign in with your existing email and password.");
        User user = new User();
        user.setFirebaseUid(identity.uid());
        user.setEmail(email);
        user.setPhone(identity.phone());
        var invitation = "google.com".equals(identity.provider()) && email != null ? invitations.findById(email) : java.util.Optional.<StaffInvitation>empty();
        user.setRole(invitation.map(StaffInvitation::getRole).orElse("VICTIM"));
        invitation.ifPresent(invitations::delete);
        String name = fullName == null || fullName.isBlank() ? identity.name() : fullName;
        if (name == null || name.isBlank()) name = "Synora member";
        user.setFullName(name.trim().substring(0, Math.min(name.trim().length(), 120)));
        return users.saveAndFlush(user);
    }
}
