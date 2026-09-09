package com.synora.backend.auth;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.synora.backend.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FirebaseVerifierTests {
    FirebaseIdentityVerifier verifier(FirebaseToken token) throws Exception {
        var sdk=mock(FirebaseAuth.class);
        when(sdk.verifyIdToken("token",true)).thenReturn(token);
        var verifier=new FirebaseIdentityVerifier("test-project");
        ReflectionTestUtils.setField(verifier,"auth",sdk);
        return verifier;
    }
    FirebaseToken token(String provider) {
        var token=mock(FirebaseToken.class);when(token.getUid()).thenReturn("uid");
        when(token.getClaims()).thenReturn(Map.of("firebase",Map.of("sign_in_provider",provider)));
        return token;
    }
    @Test void verifiedGoogleEmailIsAccepted() throws Exception {
        var token=token("google.com");when(token.getEmail()).thenReturn("x@example.com");when(token.isEmailVerified()).thenReturn(true);
        assertEquals("x@example.com",verifier(token).verify("token").email());
    }
    @Test void unverifiedGoogleEmailIsRejected() throws Exception {
        var token=token("google.com");when(token.getEmail()).thenReturn("x@example.com");
        assertThrows(ApiException.class,()->verifier(token).verify("token"));
    }
    @Test void unsupportedProviderIsRejected() throws Exception {
        assertThrows(ApiException.class,()->verifier(token("anonymous")).verify("token"));
    }
    @Test void phoneTokenWithoutVerifiedPhoneIsRejected() throws Exception {
        assertThrows(ApiException.class,()->verifier(token("phone")).verify("token"));
    }
    @Test void verifiedPhoneDoesNotTrustUnverifiedEmailClaim() throws Exception {
        var token=token("phone");when(token.getEmail()).thenReturn("unverified@example.com");
        when(token.getClaims()).thenReturn(Map.of("firebase",Map.of("sign_in_provider","phone"),"phone_number","+919876543210"));
        var identity=verifier(token).verify("token");assertNull(identity.email());assertEquals("+919876543210",identity.phone());
    }
}
