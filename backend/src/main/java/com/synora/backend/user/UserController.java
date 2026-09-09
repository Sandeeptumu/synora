package com.synora.backend.user;

import com.synora.backend.exception.ApiException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * User management endpoints (admin/officer) and profile endpoints (self).
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final com.synora.backend.audit.AuditService audit;

    public UserController(UserService userService, com.synora.backend.audit.AuditService audit) {
        this.userService = userService;
        this.audit = audit;
    }

    public record UserDto(UUID id, String email, String role, String fullName, String phone,
                          boolean active, String organization, String specialisation,
                          List<String> languageCodes, String primaryLanguage,
                          List<String> specialisations, String createdAt) {}

    static UserDto toDto(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getRole(), u.getFullName(), u.getPhone(),
                u.isActive(), u.getOrganization(), u.getSpecialisation(),
                u.getLanguageCodes(), u.getPrimaryLanguage(), u.getSpecialisations(),
                u.getCreatedAt() == null ? null : u.getCreatedAt().toString());
    }

    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','CASE_OFFICER')")
    public Map<String, Object> list(@RequestParam(required = false) String role,
                                    @RequestParam(required = false) String q,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "50") int size) {
        var users = userService.findAll();
        var filtered = users.stream()
                .filter(u -> role == null || role.isBlank() || u.getRole().equalsIgnoreCase(role))
                .filter(u -> q == null || q.isBlank()
                        || u.getFullName().toLowerCase().contains(q.toLowerCase())
                        || (u.getEmail() != null && u.getEmail().toLowerCase().contains(q.toLowerCase())))
                .sorted(java.util.Comparator.comparing(User::getCreatedAt,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .toList();
        List<UserDto> content = filtered.stream().map(UserController::toDto).toList();
        audit.log("USERS_LISTED", "USER", "role=" + role);
        return Map.of("content", content, "totalElements", content.size());
    }

    @GetMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','CASE_OFFICER')")
    public UserDto get(@PathVariable UUID id) {
        return toDto(userService.require(id));
    }

    @PatchMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public UserDto patch(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        if (body.containsKey("active")) {
            userService.setActive(id, Boolean.TRUE.equals(body.get("active")));
        }
        if (body.containsKey("fullName") || body.containsKey("phone")) {
            userService.updateProfile(id,
                    (String) body.get("fullName"), (String) body.get("phone"));
        }
        if (body.containsKey("languageCodes")) {
            userService.setLanguageCodes(id, toList(body.get("languageCodes")));
        }
        if (body.containsKey("primaryLanguage")) {
            userService.setPrimaryLanguage(id, String.valueOf(body.get("primaryLanguage")));
        }
        if (body.containsKey("specialisations")) {
            userService.setSpecialisations(id, toList(body.get("specialisations")));
        }
        return toDto(userService.require(id));
    }

    private static List<String> toList(Object v) {
        if (v instanceof List l) return l.stream().map(Object::toString).toList();
        if (v instanceof String s && !s.isBlank()) return List.of(s);
        return List.of();
    }

    @PatchMapping("/{id}/languages")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','COUNSELOR','CASE_OFFICER','VICTIM')")
    public UserDto patchLanguages(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User u = userService.require(id);
        if (id.equals(UUID.fromString(com.synora.backend.security.CurrentUser.username()))
                || "ADMIN".equals(u.getRole())) {
            // self-editing is allowed for language preferences; admins can edit anyone
        } else if (u.getRole().equals("COUNSELOR") || u.getRole().equals("CASE_OFFICER")) {
            // staff may update their own language preferences
            if (!id.equals(UUID.fromString(com.synora.backend.security.CurrentUser.username()))) {
                throw com.synora.backend.exception.ApiException.forbidden("You may only update your own language preferences");
            }
        } else {
            throw com.synora.backend.exception.ApiException.forbidden("Not permitted");
        }
        if (body.containsKey("languageCodes")) {
            userService.setLanguageCodes(id, toList(body.get("languageCodes")));
        }
        if (body.containsKey("primaryLanguage")) {
            userService.setPrimaryLanguage(id, String.valueOf(body.get("primaryLanguage")));
        }
        return toDto(userService.require(id));
    }

    @PatchMapping("/{id}/specialisations")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public UserDto patchSpecialisations(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        if (body.containsKey("specialisations")) {
            userService.setSpecialisations(id, toList(body.get("specialisations")));
        }
        return toDto(userService.require(id));
    }

    @PatchMapping("/me/languages")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','COUNSELOR','CASE_OFFICER','VICTIM')")
    public UserDto patchMyLanguages(@RequestBody Map<String, Object> body) {
        UUID me = UUID.fromString(com.synora.backend.security.CurrentUser.username());
        return patchLanguages(me, body);
    }

    @PatchMapping("/me/specialisations")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','COUNSELOR','CASE_OFFICER')")
    public UserDto patchMySpecialisations(@RequestBody Map<String, Object> body) {
        UUID me = UUID.fromString(com.synora.backend.security.CurrentUser.username());
        if (body.containsKey("specialisations")) {
            userService.setSpecialisations(me, toList(body.get("specialisations")));
        }
        return toDto(userService.require(me));
    }

    /** Self profile — any authenticated user. */
    @GetMapping("/me")
    public UserDto me() {
        String email = com.synora.backend.security.CurrentUser.username();
        return toDto(userService.requireByPrincipal(email));
    }

    @PatchMapping("/me")
    public UserDto updateMe(@RequestBody Map<String, Object> body) {
        User u = userService.requireByPrincipal(com.synora.backend.security.CurrentUser.username());
        userService.updateProfile(u.getId(), (String) body.get("fullName"), (String) body.get("phone"));
        return toDto(userService.require(u.getId()));
    }
}
