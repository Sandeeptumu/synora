package com.synora.backend.auth;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.synora.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.Map;

/** Only the Admin SDK may turn an untrusted client token into a verified identity. */
@Service
public class FirebaseIdentityVerifier {
    private final String projectId;
    private FirebaseAuth auth;
    public FirebaseIdentityVerifier(@Value("${synora.firebase.project-id:}") String projectId) {
        this.projectId = projectId;
    }
    public boolean isConfigured() { return !projectId.isBlank(); }

    private synchronized FirebaseAuth auth() {
        if (!isConfigured()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                "Google and phone sign-in are not configured yet. Please use email sign-in.");
        if (auth == null) {
            try {
                synchronized (FirebaseApp.class) {
                    var existing = FirebaseApp.getApps().stream().filter(a -> a.getName().equals("synora-auth")).findFirst();
                    FirebaseApp app;
                    if (existing.isPresent()) {
                        app = existing.get();
                        if (!projectId.equals(app.getOptions().getProjectId())) throw new IllegalArgumentException("Firebase project changed; restart backend");
                    } else {
                        var options = FirebaseOptions.builder().setProjectId(projectId)
                                .setCredentials(GoogleCredentials.getApplicationDefault()).build();
                        app = FirebaseApp.initializeApp(options, "synora-auth");
                    }
                    auth = FirebaseAuth.getInstance(app);
                }
            } catch (IOException | IllegalArgumentException ex) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Sign-in provider is unavailable. Please use email sign-in.");
            }
        }
        return auth;
    }

    public record Identity(String uid, String provider, String email, String phone, String name) {}

    public Identity verify(String idToken) {
        FirebaseAuth verifier = auth();
        try {
            var token = verifier.verifyIdToken(idToken, true);
            var claims = token.getClaims();
            Object firebase = claims.get("firebase");
            String provider = firebase instanceof Map<?, ?> m ? String.valueOf(m.get("sign_in_provider")) : "";
            if (!"google.com".equals(provider) && !"phone".equals(provider))
                throw ApiException.unauthorized("This sign-in provider is not supported.");
            String email = token.getEmail();
            String phone = claims.get("phone_number") instanceof String s ? s : null;
            if ("google.com".equals(provider) && (!token.isEmailVerified() || email == null || email.isBlank()))
                throw ApiException.unauthorized("A verified Google email is required.");
            if ("phone".equals(provider) && (phone == null || !phone.matches("^\\+[1-9]\\d{7,14}$")))
                throw ApiException.unauthorized("Phone verification is required.");
            return new Identity(token.getUid(), provider, "google.com".equals(provider) ? email : null,
                    "phone".equals(provider) ? phone : null, token.getName());
        } catch (FirebaseAuthException ex) {
            throw ApiException.unauthorized("Your sign-in expired or could not be verified. Please try again.");
        }
    }
}
