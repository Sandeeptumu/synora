package com.synora.backend.casehub;

import com.synora.backend.audit.AuditService;
import com.synora.backend.exception.ApiException;
import com.synora.backend.user.User;
import com.synora.backend.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Case CRUD + assignment + status endpoints.
 */
@RestController
@RequestMapping("/api/cases")
public class CaseController {

    private final CaseService caseService;
    private final UserService userService;
    private final AuditService audit;

    public CaseController(CaseService caseService, UserService userService, AuditService audit) {
        this.caseService = caseService;
        this.userService = userService;
        this.audit = audit;
    }

    public record CreateCaseRequest(@NotBlank String victimUserId, @NotBlank String title,
                                    String category, String region, String summary) {}

    public record CaseDto(String caseNumber, String title, String category, String status,
                          String priority, String region, String summary,
                          UUID victimUserId, String victimName,
                          UUID counselorId, String counselorName,
                          UUID officerId, String officerName,
                          String createdAt, String updatedAt) {}

    static CaseDto toDto(Case c) {
        DateTimeFormatter f = DateTimeFormatter.ISO_INSTANT;
        return new CaseDto(
                c.getCaseNumber(), c.getTitle(), c.getCategory(), c.getStatus(), c.getPriority(),
                c.getRegion(), c.getSummary(),
                c.getVictim().getId(), c.getVictim().getFullName(),
                c.getAssignedCounselor() != null ? c.getAssignedCounselor().getId() : null,
                c.getAssignedCounselor() != null ? c.getAssignedCounselor().getFullName() : null,
                c.getAssignedOfficer() != null ? c.getAssignedOfficer().getId() : null,
                c.getAssignedOfficer() != null ? c.getAssignedOfficer().getFullName() : null,
                f.format(c.getCreatedAt()), c.getUpdatedAt() == null ? null : f.format(c.getUpdatedAt()));
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('CASE_OFFICER','ADMIN')")
    public CaseDto create(@Valid @RequestBody CreateCaseRequest req,
                          @RequestParam(required = false) UUID officerId) {
        User officer = userService.requireByPrincipal(com.synora.backend.security.CurrentUser.username());
        Case c = caseService.create(UUID.fromString(req.victimUserId()), req.title(),
                req.category(), req.region(), req.summary(), officer.getId());
        return toDto(c);
    }

    @GetMapping
    public List<CaseDto> list() {
        User actor = userService.requireByPrincipal(com.synora.backend.security.CurrentUser.username());
        List<Case> cases = caseService.visibleTo(actor);
        audit.log("CASES_LISTED", "CASE", cases.size() + " cases");
        return cases.stream().map(CaseController::toDto).toList();
    }

    @GetMapping("/{caseNumber}")
    public CaseDto get(@PathVariable String caseNumber) {
        User actor = userService.requireByPrincipal(com.synora.backend.security.CurrentUser.username());
        Case c = caseService.requireByNumber(caseNumber);
        caseService.assertCanView(actor, c);
        audit.log("CASE_VIEWED", "CASE", caseNumber);
        return toDto(c);
    }

    @PostMapping("/{caseNumber}/assign")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('CASE_OFFICER','ADMIN')")
    public CaseDto assignCounselor(@PathVariable String caseNumber, @RequestBody Map<String, Object> body) {
        Object cid = body.get("counselorId");
        if (cid == null) throw ApiException.badRequest("counselorId is required");
        User actor = userService.requireByPrincipal(com.synora.backend.security.CurrentUser.username());
        caseService.assertCanView(actor, caseService.requireByNumber(caseNumber));
        Case c = caseService.assignCounselor(caseNumber, UUID.fromString(cid.toString()));
        return toDto(c);
    }

    @PostMapping("/{caseNumber}/officer")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public CaseDto assignOfficer(@PathVariable String caseNumber, @RequestBody Map<String,String> body) {
        if (body.get("officerId") == null) throw ApiException.badRequest("Select an officer");
        return toDto(caseService.assignOfficer(caseNumber, UUID.fromString(body.get("officerId"))));
    }

    @PatchMapping("/{caseNumber}/status")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('CASE_OFFICER','ADMIN','COUNSELOR')")
    public CaseDto updateStatus(@PathVariable String caseNumber, @RequestBody Map<String, Object> body) {
        User actor = userService.requireByPrincipal(com.synora.backend.security.CurrentUser.username());
        Case c = caseService.requireByNumber(caseNumber);
        caseService.assertCanView(actor, c);
        Case updated = caseService.updateStatus(caseNumber, String.valueOf(body.get("status")));
        return toDto(updated);
    }

    /** Case timeline assembled from audit trail + domain events. */
    @GetMapping("/{caseNumber}/timeline")
    public List<Map<String, Object>> timeline(@PathVariable String caseNumber) {
        User actor = userService.requireByPrincipal(com.synora.backend.security.CurrentUser.username());
        Case c = caseService.requireByNumber(caseNumber);
        caseService.assertCanView(actor, c);
        return caseService.timelineFor(c);
    }
}
