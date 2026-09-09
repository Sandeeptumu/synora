package com.synora.backend.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Local LLM provider via Ollama. Keeps all analysis on-premise.
 * Falls back to isAvailable()==false when unreachable, letting callers
 * use the deterministic demo provider instead.
 */
@Component
public class OllamaAIProvider implements AIProvider {

    private static final Logger log = LoggerFactory.getLogger(OllamaAIProvider.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(4);

    private final com.synora.backend.config.SynoraProperties props;
    private final HttpClient http;
    private volatile Boolean cachedAvailability;

    public OllamaAIProvider(com.synora.backend.config.SynoraProperties props) {
        this.props = props;
        this.http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    }

    @Override
    public String name() {
        return "ollama";
    }

    @Override
    public boolean isAvailable() {
        if (cachedAvailability != null) return cachedAvailability;
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(props.ai().ollama().baseUrl() + "/api/tags"))
                    .timeout(TIMEOUT)
                    .GET().build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            cachedAvailability = resp.statusCode() == 200;
        } catch (Exception e) {
            cachedAvailability = false;
        }
        return cachedAvailability;
    }

    @Override
    public TextSignal analyzeText(String text) {
        if (!isAvailable()) return null;
        try {
            String prompt = """
                    You are a mental-health screening assistant for a support platform.
                    Analyze the text below. Respond ONLY with compact JSON:
                    {"distressScore":0.0-1.0,"sentiment":"positive|neutral|mixed|negative","themes":["..."],"emotionalIndicators":["..."],"sleepDisruption":true|false,"urgency":true|false}
                    Text: %s
                    """.formatted(text);
            String body = "{\"model\":\"" + props.ai().ollama().model()
                    + "\",\"prompt\":\"" + escape(prompt) + "\",\"stream\":false}";
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(props.ai().ollama().baseUrl() + "/api/generate"))
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;
            String json = extractJson(resp.body());
            return parseTextSignal(json);
        } catch (Exception e) {
            log.warn("Ollama text analysis failed: {}", e.toString());
            cachedAvailability = false;
            return null;
        }
    }

    @Override
    public VoiceSignal analyzeVoice(byte[] audio, String contentType) {
        // Local ASR not part of prototype; deterministic analyzer handles voice.
        return null;
    }

    private TextSignal parseTextSignal(String json) {
        Map<String, Object> root = parseJson(json);
        double score = ((Number) root.getOrDefault("distressScore", 0.3)).doubleValue();
        List<String> themes = ((List<?>) root.getOrDefault("themes", List.of()))
                .stream().map(String::valueOf).toList();
        List<String> emo = ((List<?>) root.getOrDefault("emotionalIndicators", List.of()))
                .stream().map(String::valueOf).toList();
        return new TextSignal(
                AIProvider.clamp01(score),
                String.valueOf(root.getOrDefault("sentiment", "neutral")),
                themes, emo,
                Boolean.TRUE.equals(root.get("sleepDisruption")),
                Boolean.TRUE.equals(root.get("urgency")),
                Boolean.TRUE.equals(root.get("urgency")) ? "LLM flagged urgent language" : null,
                0.75, "ollama:" + props.ai().ollama().model());
    }

    private static String extractJson(String ollamaBody) {
        Map<String, Object> root = parseJson(ollamaBody);
        String response = String.valueOf(root.get("response"));
        int s = response.indexOf('{');
        int e = response.lastIndexOf('}');
        return (s >= 0 && e > s) ? response.substring(s, e + 1) : "{}";
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> parseJson(String json) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
