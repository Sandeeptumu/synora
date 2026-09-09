package com.synora.backend.support;

import com.synora.backend.exception.ApiException;
import com.synora.backend.user.UserService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    private final SupportService support;
    private final UserService userService;

    public SupportController(SupportService support, UserService userService) {
        this.support = support;
        this.userService = userService;
    }

    private UUID currentUserId() {
        return UUID.fromString(com.synora.backend.security.CurrentUser.username());
    }

    @PostMapping("/check-in")
    public Map<String, Object> submitCheckIn(@RequestBody Map<String, Object> body) {
        UUID userId = currentUserId();
        String mood = String.valueOf(body.getOrDefault("mood", ""));
        Integer stress = toInt(body.get("stressLevel"));
        Integer energy = toInt(body.get("energyLevel"));
        Integer sleep = toInt(body.get("sleepQuality"));
        Integer connection = toInt(body.get("connectionLevel"));
        String note = String.valueOf(body.getOrDefault("noteText", "")).trim();
        if (!List.of("very_low", "low", "okay", "good", "great").contains(mood)) {
            throw ApiException.badRequest("Invalid mood value");
        }
        if (stress != null && (stress < 1 || stress > 10)) throw ApiException.badRequest("stressLevel must be 1..10");
        if (energy != null && (energy < 1 || energy > 10)) throw ApiException.badRequest("energyLevel must be 1..10");
        if (sleep != null && (sleep < 1 || sleep > 10)) throw ApiException.badRequest("sleepQuality must be 1..10");
        if (connection != null && (connection < 1 || connection > 10)) throw ApiException.badRequest("connectionLevel must be 1..10");
        try {
            UUID id = support.recordCheckIn(userId, mood, stress, energy, sleep, connection, note);
            var triage = support.assess(userId);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("checkInId", id);
            resp.put("riskLevel", triage.getRiskLevel());
            resp.put("primaryConcern", triage.getPrimaryConcern());
            resp.put("suggestedSupport", triage.getSuggestedSupport());
            resp.put("disclaimer", "Support triage only — not a medical diagnosis.");
            return resp;
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest(e.getMessage());
        }
    }

    @GetMapping("/check-in/today")
    public Map<String, Object> todayCheckIn() {
        UUID userId = currentUserId();
        var r = support.todayCheckIn(userId);
        if (r == null) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("today", false);
            return m;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("today", true);
        m.put("mood", r.getMood());
        m.put("stressLevel", r.getStressLevel());
        m.put("energyLevel", r.getEnergyLevel());
        m.put("sleepQuality", r.getSleepQuality());
        m.put("connectionLevel", r.getConnectionLevel());
        m.put("noteText", r.getNoteText());
        m.put("createdAt", r.getCreatedAt().toString());
        return m;
    }

    @GetMapping("/check-in/history")
    public List<Map<String, Object>> checkInHistory() {
        UUID userId = currentUserId();
        return support.history(userId).stream()
                .map(r -> {
                    Map<String, Object> mm = new LinkedHashMap<>();
                    mm.put("id", r.getId().toString());
                    mm.put("mood", r.getMood());
                    mm.put("stressLevel", r.getStressLevel());
                    mm.put("energyLevel", r.getEnergyLevel());
                    mm.put("sleepQuality", r.getSleepQuality());
                    mm.put("connectionLevel", r.getConnectionLevel());
                    mm.put("noteText", r.getNoteText());
                    mm.put("createdAt", r.getCreatedAt().toString());
                    return mm;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/triage")
    public Map<String, Object> triage() {
        UUID userId = currentUserId();
        var t = support.currentTriage(userId).orElseGet(() -> support.assess(userId));
        Map<String, Object> tm = new LinkedHashMap<>();
        tm.put("primaryConcern", t.getPrimaryConcern());
        tm.put("concernAreas", t.getConcernAreas());
        tm.put("riskLevel", t.getRiskLevel());
        tm.put("suggestedSupport", t.getSuggestedSupport());
        tm.put("matchSummary", t.getMatchSummary());
        tm.put("disclaimer", "Support triage only — not a medical diagnosis.");
        return tm;
    }

    @PostMapping("/chat/message")
    public Map<String, Object> chatMessage(@RequestBody Map<String, Object> body) {
        UUID userId = currentUserId();
        String text = String.valueOf(body.getOrDefault("text", "")).trim();
        if (text.isBlank()) throw ApiException.badRequest("Message text is required");
        support.addMessage(userId, "USER", text);
        String aiReply = buildAiReply(userId, text);
        support.addMessage(userId, "AI", aiReply);
        Map<String, Object> rm = new LinkedHashMap<>();
        rm.put("reply", aiReply);
        rm.put("disclaimer", "AI-provided support guidance only — not a medical diagnosis.");
        return rm;
    }

    @GetMapping("/chat/history")
    public List<Map<String, Object>> chatHistory() {
        return support.conversationHistory(currentUserId());
    }

    @PostMapping("/chat/clear")
    public Map<String, Object> clearChat() {
        support.clearConversation(currentUserId());
        Map<String, Object> cm = new LinkedHashMap<>();
        cm.put("cleared", true);
        return cm;
    }

    @GetMapping("/experts")
    public List<Map<String, Object>> experts(@RequestParam(defaultValue = "6") int limit) {
        return support.recommendExperts(currentUserId(), limit);
    }

    private String buildAiReply(UUID userId, String userText) {
        String lower = userText.toLowerCase(Locale.ROOT);
        // Crisis/safeguarding-first reply
        if (lower.contains("self-harm") || lower.contains("end it") || lower.contains("kill myself")
                || lower.contains("not worth living") || lower.contains("can't go on")
                || lower.contains("suicide") || lower.contains("emergency")) {
            return "It sounds like you are going through something really difficult, and I am glad you reached out. "
                    + "I cannot provide medical help, and I want to make sure you have immediate human support available. "
                    + "Please use the urgent support option in the app or contact your local emergency services if you feel you may be in immediate danger. "
                    + "You do not have to handle this alone.";
        }
        if (lower.contains("safe") && (lower.contains("abuse") || lower.contains("unsafe") || lower.contains("protect"))) {
            return "Based on what you have shared, safety may be an important issue here. "
                    + "I am not able to assess or diagnose this, but speaking with a qualified professional could help. "
                    + "If you feel unsafe right now, please use the urgent support option in the app or contact your local emergency services.";
        }
        // Generic supportive replies keyed to user cues, never diagnosing
        if (lower.contains("work") || lower.contains("job") || lower.contains("office") || lower.contains("overwork")) {
            return "Based on what you have shared, work-related stress may be part of what you are experiencing. "
                    + "That does not mean anything is wrong with you — many people find work pressure hard to carry alone. "
                    + "It may be helpful to speak with someone who can support you in managing that pressure.";
        }
        if (lower.contains("study") || lower.contains("exam") || lower.contains("academic") || lower.contains("school") || lower.contains("grade")) {
            return "Based on what you have shared, academic pressure may be weighing on you. "
                    + "Your responses may indicate that this is a stressful area for you right now, and support can help you carry it. "
                    + "It may be helpful to speak with someone experienced in academic stress.";
        }
        if (lower.contains("anxious") || lower.contains("anxiety") || lower.contains("panic") || lower.contains("worry") || lower.contains("nervous")) {
            return "Your responses may indicate that anxiety-related concerns are coming up for you. "
                    + "This is not a diagnosis. Speaking with a professional can help you understand what is happening and find ways to cope.";
        }
        if (lower.contains("sad") || lower.contains("depressed") || lower.contains("down") || lower.contains("hopeless") || lower.contains("numb")) {
            return "Based on what you have shared, low mood may be part of what you are experiencing. "
                    + "This is not a diagnosis. It may be helpful to speak with someone who can support you through this.";
        }
        if (lower.contains("relationship") || lower.contains("partner") || lower.contains("family") || lower.contains("parent") || lower.contains("friend") || lower.contains("lonely") || lower.contains("alone")) {
            return "Based on what you have shared, relationship or connection concerns may be important right now. "
                    + "It may be helpful to speak with someone who can support you in navigating these.";
        }
        if (lower.contains("money") || lower.contains("finance") || lower.contains("debt") || lower.contains("financial")) {
            return "Based on what you have shared, financial stress may be part of what you are experiencing. "
                    + "It may be helpful to speak with someone who can support you in managing this and any related concerns.";
        }
        if (lower.contains("grief") || lower.contains("loss") || lower.contains("passed away") || lower.contains("died")) {
            return "Based on what you have shared, grief may be a significant part of what you are experiencing. "
                    + "It may be helpful to speak with someone who can support you through this.";
        }
        if (lower.contains("sleep") || lower.contains("insomnia") || lower.contains("tired") || lower.contains("exhausted")) {
            return "Based on what you have shared, sleep and energy may be affected right now. "
                    + "This can happen when stress or other concerns are present. It may be helpful to speak with someone about what you are experiencing.";
        }
        // Fallback supportive reply
        return "Thank you for sharing this with me. Based on what you have shared, it may be helpful to speak with a qualified professional who can support you further. "
                + "I am not able to diagnose or provide medical advice, but I can help you find someone appropriate if you would like.";
    }

    private static Integer toInt(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return null; }
    }
}
