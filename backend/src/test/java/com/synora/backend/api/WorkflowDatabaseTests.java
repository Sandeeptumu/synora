package com.synora.backend.api;
import com.synora.backend.user.*;
import com.synora.backend.casehub.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest @Transactional
@EnabledIfEnvironmentVariable(named="SYNORA_DB_TESTS", matches="true")
class WorkflowDatabaseTests {
 @Autowired WorkflowController workflow; @Autowired UserService users; @Autowired CaseRepository cases; @Autowired CaseService caseService;
 void actor(User u) {SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(u.getId().toString(),"",List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole()))));}
 User member(String role) {return users.register("workflow-"+UUID.randomUUID()+"@example.invalid","Temporary-test-password-736!",role,"Workflow test",null,null,null,List.of(),null,List.of());}
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 @Test void firstCasePersistsAndRepeatSubmissionReusesIt() {
  User person=member("VICTIM");actor(person);
  String first=workflow.ownCase().get("caseNumber");
  assertEquals(first,workflow.ownCase().get("caseNumber"));
  assertEquals(1,cases.findByVictimIdOrderByCreatedAtDesc(person.getId()).size());
  User counselor=member("COUNSELOR");caseService.assignCounselor(first,counselor.getId());
  assertEquals(first,caseService.visibleTo(counselor).get(0).getCaseNumber());
 }
 @Test void victimCannotGrantStaffAccess() {
  actor(member("VICTIM"));
  assertThrows(org.springframework.security.access.AccessDeniedException.class,()->workflow.grant(new WorkflowController.StaffRequest("blocked@example.invalid","COUNSELOR")));
 }
 @Test void administratorCanGrantStaffAccessToSeparateAccount() {
  User staff=member("VICTIM");actor(member("ADMIN"));
  workflow.grant(new WorkflowController.StaffRequest(staff.getEmail(),"COUNSELOR"));
  assertEquals("COUNSELOR",users.require(staff.getId()).getRole());
 }
}
