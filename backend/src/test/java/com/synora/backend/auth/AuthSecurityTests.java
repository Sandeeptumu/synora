package com.synora.backend.auth;

import com.synora.backend.audit.AuditService;
import com.synora.backend.config.JwtAuthFilter;
import com.synora.backend.config.SynoraProperties;
import com.synora.backend.exception.ApiException;
import com.synora.backend.security.JwtService;
import com.synora.backend.user.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthSecurityTests {
    final UserRepository users = mock(UserRepository.class);
    final UUID id = UUID.randomUUID();
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    User user(String role) {
        User u = mock(User.class);
        when(u.getId()).thenReturn(id); when(u.getRole()).thenReturn(role);
        when(u.isActive()).thenReturn(true); when(u.getFullName()).thenReturn("Test Member");
        return u;
    }
    JwtService jwt() {
        return new JwtService(new SynoraProperties(new SynoraProperties.Jwt("test-signing-secret-at-least-thirty-two-characters", 1),null,null,null,null,null,null));
    }
    @Test void publicRegistrationCannotChooseStaffRole() {
        var service=mock(UserService.class);var tokens=mock(JwtService.class);
        var registered=user("VICTIM");
        when(service.register(anyString(),anyString(),eq("VICTIM"),anyString(),isNull(),isNull(),isNull(),eq(List.of()),isNull(),eq(List.of()))).thenReturn(registered);
        var controller=new AuthController(service,tokens,mock(AuditService.class),mock(StaffInvitationRepository.class));
        var result=controller.register(new AuthController.RegisterRequest("x@example.com","password123","ADMIN","Test Member","+919876543210","Org","Specialist"));
        assertEquals("VICTIM",result.role());
        verify(service).register("x@example.com","password123","VICTIM","Test Member",null,null,null,List.of(),null,List.of());
    }
    @Test void roleIsOptionalForEmailRegistration() {
        var service=mock(UserService.class);
        var registered=user("VICTIM");
        when(service.register(anyString(),anyString(),eq("VICTIM"),anyString(),isNull(),isNull(),isNull(),eq(List.of()),isNull(),eq(List.of()))).thenReturn(registered);
        var controller=new AuthController(service,jwt(),mock(AuditService.class),mock(StaffInvitationRepository.class));
        assertNotNull(controller.register(new AuthController.RegisterRequest("x@example.com","password123",null,"Test Member",null,null,null)).token());
    }
    @Test void phoneIdentityCreatesPersonalUserWithoutFakeEmailOrPassword() {
        when(users.findByFirebaseUid("phone-uid")).thenReturn(Optional.empty());
        when(users.saveAndFlush(any())).thenAnswer(inv->inv.getArgument(0));
        var result=new ExternalAccountService(users, mock(StaffInvitationRepository.class)).signIn(new FirebaseIdentityVerifier.Identity("phone-uid","phone",null,"+919876543210",null),null);
        assertNull(result.getEmail());assertNull(result.getPasswordHash());assertEquals("VICTIM",result.getRole());
        assertEquals("+919876543210",result.getPhone());assertEquals("phone-uid",result.getFirebaseUid());
    }
    @Test void googleIdentityIsNormalizedAndPersonal() {
        when(users.findByFirebaseUid("google-uid")).thenReturn(Optional.empty());
        when(users.saveAndFlush(any())).thenAnswer(inv->inv.getArgument(0));
        var result=new ExternalAccountService(users, mock(StaffInvitationRepository.class)).signIn(new FirebaseIdentityVerifier.Identity("google-uid","google.com","User@Example.com",null,"Google Name"),null);
        assertEquals("user@example.com",result.getEmail());assertEquals("Google Name",result.getFullName());assertEquals("VICTIM",result.getRole());
    }
    @Test void repeatProviderLoginPreservesExistingRoleAndDoesNotCreateUser() {
        var existing=user("COUNSELOR");when(users.findByFirebaseUid("uid")).thenReturn(Optional.of(existing));
        assertSame(existing,new ExternalAccountService(users, mock(StaffInvitationRepository.class)).signIn(new FirebaseIdentityVerifier.Identity("uid","google.com","x@example.com",null,null),"Changed"));
        verify(users,never()).saveAndFlush(any());
    }
    @Test void deactivatedProviderAccountCannotSignIn() {
        var existing=user("VICTIM");when(existing.isActive()).thenReturn(false);
        when(users.findByFirebaseUid("uid")).thenReturn(Optional.of(existing));
        assertThrows(ApiException.class,()->new ExternalAccountService(users, mock(StaffInvitationRepository.class)).signIn(new FirebaseIdentityVerifier.Identity("uid","phone",null,"+919876543210",null),null));
    }
    @Test void existingEmailIsNotSilentlyLinkedToExternalIdentity() {
        when(users.findByFirebaseUid("uid")).thenReturn(Optional.empty());when(users.existsByEmailIgnoreCase("x@example.com")).thenReturn(true);
        var error=assertThrows(ApiException.class,()->new ExternalAccountService(users, mock(StaffInvitationRepository.class)).signIn(new FirebaseIdentityVerifier.Identity("uid","google.com","x@example.com",null,null),null));
        assertEquals(409,error.getStatus().value());verify(users,never()).saveAndFlush(any());
    }
    @Test void providerAccountCannotUseEmailPasswordLoginWithNullHash() {
        User u=new User();u.setEmail("x@example.com");u.setRole("VICTIM");
        when(users.findByEmailIgnoreCase("x@example.com")).thenReturn(Optional.of(u));
        assertThrows(ApiException.class,()->new UserService(users,mock(PasswordEncoder.class),mock(AuditService.class)).verifyCredentials("x@example.com","anything"));
    }
    @Test void firebaseWithoutConfigurationFailsClosed() {
        var verifier=new FirebaseIdentityVerifier("");assertFalse(verifier.isConfigured());
        assertEquals(503,assertThrows(ApiException.class,()->verifier.verify("untrusted-token")).getStatus().value());
    }
    @Test void invalidProviderTokenNeverReachesAccountCreation() {
        var verifier=mock(FirebaseIdentityVerifier.class);when(verifier.verify("invalid")).thenThrow(ApiException.unauthorized("Invalid"));
        var accounts=mock(ExternalAccountService.class);
        var controller=new ExternalAuthController(verifier,accounts,jwt(),mock(AuditService.class));
        assertThrows(ApiException.class,()->controller.signIn(new ExternalAuthController.FirebaseRequest("invalid",null)));
        verifyNoInteractions(accounts);
    }
    @Test void signedTokenUsesDatabaseRoleRatherThanOldRoleClaim() throws Exception {
        var tokens=jwt();var current=user("VICTIM");when(users.findById(id)).thenReturn(Optional.of(current));
        var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer "+tokens.generate("legacy@example.com","ADMIN",id.toString()));
        new JwtAuthFilter(tokens,users).doFilter(request,new MockHttpServletResponse(),(req,res)->{});
        var auth=SecurityContextHolder.getContext().getAuthentication();assertEquals(id.toString(),auth.getName());
        assertEquals("ROLE_VICTIM",auth.getAuthorities().iterator().next().getAuthority());
    }
    @Test void existingSessionStopsWorkingAfterAccountDeactivation() throws Exception {
        var tokens=jwt();var disabled=user("VICTIM");when(disabled.isActive()).thenReturn(false);when(users.findById(id)).thenReturn(Optional.of(disabled));
        var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer "+tokens.generate(id.toString(),"VICTIM",id.toString()));
        new JwtAuthFilter(tokens,users).doFilter(request,new MockHttpServletResponse(),(req,res)->{});
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
    @Test void invalidSignatureCannotCreateSession() throws Exception {
        var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer not.a.jwt");
        new JwtAuthFilter(jwt(),users).doFilter(request,new MockHttpServletResponse(),(req,res)->{});
        assertNull(SecurityContextHolder.getContext().getAuthentication());verifyNoInteractions(users);
    }
}
