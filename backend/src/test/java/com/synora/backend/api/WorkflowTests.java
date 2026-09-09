package com.synora.backend.api;
import com.synora.backend.auth.*;
import com.synora.backend.user.*;
import com.synora.backend.casehub.*;
import com.synora.backend.audit.AuditService;
import com.synora.backend.exception.ApiException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.*;
import org.mockito.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class WorkflowTests {
 @Mock UserService users; @Mock UserRepository userRepo; @Mock CaseRepository cases; @Mock CaseService caseService;
 @Mock StaffInvitationRepository invitations; @Mock EntityManager em; @Mock AuditService audit;
 @InjectMocks WorkflowController controller;
 AutoCloseable mocks; User owner;
 @BeforeEach void init() {
  mocks=MockitoAnnotations.openMocks(this);owner=mock(User.class);
  when(owner.getId()).thenReturn(UUID.randomUUID());when(owner.getRole()).thenReturn("VICTIM");
  SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("owner",""));
  when(users.requireByPrincipal("owner")).thenReturn(owner);
 }
 @AfterEach void cleanup() throws Exception {SecurityContextHolder.clearContext();mocks.close();}
 @Test void existingCaseIsReused() {
  Case c=mock(Case.class);when(c.getCaseNumber()).thenReturn("CASE-1");when(c.getStatus()).thenReturn("OPEN");
  when(cases.findByVictimIdOrderByCreatedAtDesc(owner.getId())).thenReturn(List.of(c));
  assertEquals("CASE-1",controller.ownCase().get("caseNumber"));
  verify(em).lock(owner,LockModeType.PESSIMISTIC_WRITE);verifyNoInteractions(caseService);
 }
 @Test void firstSubmissionCreatesPersonalCase() {
  Case c=mock(Case.class);when(c.getCaseNumber()).thenReturn("CASE-new");
  when(caseService.create(eq(owner.getId()),anyString(),eq("SELF_SERVICE"),isNull(),anyString(),isNull())).thenReturn(c);
  assertEquals("CASE-new",controller.ownCase().get("caseNumber"));
 }
 @Test void staffCannotOpenPersonalCase() {when(owner.getRole()).thenReturn("ADMIN");assertThrows(ApiException.class,()->controller.ownCase());verifyNoInteractions(cases);}
 @Test void cannotGrantAdministratorThroughStaffEndpoint() {assertThrows(ApiException.class,()->controller.grant(new WorkflowController.StaffRequest("a@example.com","ADMIN")));verifyNoInteractions(invitations);}
 @Test void newStaffEmailIsNormalizedAndReserved() {
  controller.grant(new WorkflowController.StaffRequest("Staff@Example.com","COUNSELOR"));
  var cap=ArgumentCaptor.forClass(StaffInvitation.class);verify(invitations).save(cap.capture());
  assertEquals("staff@example.com",cap.getValue().getEmail());assertEquals("COUNSELOR",cap.getValue().getRole());
 }
 @Test void cannotConvertAccountWithPersonalCases() {
  when(owner.isActive()).thenReturn(true);when(userRepo.findByEmailIgnoreCase("owner@example.com")).thenReturn(Optional.of(owner));
  when(cases.findByVictimIdOrderByCreatedAtDesc(owner.getId())).thenReturn(List.of(mock(Case.class)));
  assertThrows(ApiException.class,()->controller.grant(new WorkflowController.StaffRequest("owner@example.com","COUNSELOR")));
  verify(owner,never()).setRole(anyString());
 }
 @Test void verifiedGoogleInvitationCreatesStaffAccount() {
  when(invitations.findById("staff@example.com")).thenReturn(Optional.of(new StaffInvitation("staff@example.com","COUNSELOR")));
  when(userRepo.saveAndFlush(any())).thenAnswer(i->i.getArgument(0));
  var user=new ExternalAccountService(userRepo,invitations).signIn(new FirebaseIdentityVerifier.Identity("uid","google.com","staff@example.com",null,"Staff"),null);
  assertEquals("COUNSELOR",user.getRole());verify(invitations).delete(any(StaffInvitation.class));
 }
 @Test void phoneIdentityCannotClaimEmailInvitation() {
  when(userRepo.saveAndFlush(any())).thenAnswer(i->i.getArgument(0));
  var user=new ExternalAccountService(userRepo,invitations).signIn(new FirebaseIdentityVerifier.Identity("uid","phone",null,"+919876543210","Staff"),null);
  assertEquals("VICTIM",user.getRole());verifyNoInteractions(invitations);
 }
}
