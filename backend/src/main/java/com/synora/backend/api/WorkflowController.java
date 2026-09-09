package com.synora.backend.api;
import com.synora.backend.auth.*;
import com.synora.backend.user.*;
import com.synora.backend.casehub.*;
import com.synora.backend.audit.AuditService;
import com.synora.backend.exception.ApiException;
import com.synora.backend.security.CurrentUser;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@RestController @RequestMapping("/api")
public class WorkflowController {
 private final UserService users;
 private final UserRepository userRepo;
 private final CaseRepository cases;
 private final CaseService caseService;
 private final StaffInvitationRepository invitations;
 private final EntityManager em;
 private final AuditService audit;
 public WorkflowController(UserService users,UserRepository userRepo,CaseRepository cases,CaseService caseService,StaffInvitationRepository invitations,EntityManager em,AuditService audit) {
  this.users=users;this.userRepo=userRepo;this.cases=cases;this.caseService=caseService;this.invitations=invitations;this.em=em;this.audit=audit;
 }
 public record StaffRequest(@NotBlank @Email @Size(max=180) String email,@NotBlank String role) {}
 @PostMapping("/admin/staff") @PreAuthorize("hasRole('ADMIN')") @Transactional
 public Map<String,String> grant(@Valid @RequestBody StaffRequest req) {
  if (!Set.of("COUNSELOR","CASE_OFFICER").contains(req.role())) throw ApiException.badRequest("Choose counselor or case officer");
  String email=req.email().trim().toLowerCase(Locale.ROOT);
  var existing=userRepo.findByEmailIgnoreCase(email);
  if (existing.isPresent()) {
   User u=existing.get();
   if ("ADMIN".equals(u.getRole())) throw ApiException.badRequest("Administrator accounts cannot be changed here");
   if (!u.isActive()) throw ApiException.badRequest("Activate the account before granting staff access");
   if (!cases.findByVictimIdOrderByCreatedAtDesc(u.getId()).isEmpty()) throw ApiException.badRequest("This account has personal cases. Use a separate staff email.");
   u.setRole(req.role());userRepo.save(u);
   invitations.deleteById(email);
  } else invitations.save(new StaffInvitation(email,req.role()));
  audit.log("STAFF_ACCESS_GRANTED","USER",email+" role="+req.role());
  return Map.of("message",existing.isPresent()?"Role updated. Sign out and sign in again using the existing login method.":"Access reserved. Sign in with Google using this exact email to activate the staff account.");
 }
 @GetMapping("/admin/staff-invitations") @PreAuthorize("hasRole('ADMIN')")
 public List<StaffInvitation> invitations() { return invitations.findAll(); }
 @DeleteMapping("/admin/staff-invitations") @PreAuthorize("hasRole('ADMIN')") @Transactional
 public void revoke(@RequestParam String email) { invitations.deleteById(email.toLowerCase(Locale.ROOT));audit.log("STAFF_INVITATION_REVOKED","USER",email); }
 @PostMapping("/me/case") @PreAuthorize("hasRole('VICTIM')") @Transactional
 public Map<String,String> ownCase() {
  User owner=users.requireByPrincipal(CurrentUser.username());
  if (!"VICTIM".equals(owner.getRole())) throw ApiException.forbidden("Personal accounts only");
  em.lock(owner,LockModeType.PESSIMISTIC_WRITE);
  var existing=cases.findByVictimIdOrderByCreatedAtDesc(owner.getId()).stream().filter(c->!"CLOSED".equals(c.getStatus())).findFirst();
  var c=existing.orElseGet(()->caseService.create(owner.getId(),"Personal support","SELF_SERVICE",null,"Opened with the first check-in",null));
  return Map.of("caseNumber",c.getCaseNumber());
 }
}
