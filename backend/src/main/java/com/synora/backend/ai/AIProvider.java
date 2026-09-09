package com.synora.backend.ai;

import java.util.List;
import java.util.Map;

/**
 * Abstraction over AI analysis providers. Implementations:
 * {@link OllamaAIProvider} (local LLM) and {@link DemoAIProvider} (deterministic).
 */
public interface AIProvider {

    /** @return provider identifier, e.g. "ollama" or "demo" */
    String name();

    /** @return true when the provider is currently reachable/usable */
    boolean isAvailable();

    /**
     * Analyze free text for distress signals.
     */
    TextSignal analyzeText(String text);

    /**
     * Analyze voice audio bytes for prosody/tone distress signals.
     */
    VoiceSignal analyzeVoice(byte[] audio, String contentType);

    /**
     * Optional conversational summarization used by demo mode / counselor notes.
     */
    default String summarize(String prompt) { return null; }

    /** Result of text analysis. */
    record TextSignal(
            double distressScore,
            String sentiment,
            List<String> themes,
            List<String> emotionalIndicators,
            boolean sleepDisruption,
            boolean urgency,
            String urgencyNote,
            double confidence,
            String provider) {}

    /** Result of voice analysis. */
    record VoiceSignal(
            double distressScore,
            List<String> toneIndicators,
            double energyLevel,
            double speechRate,
            double confidence,
            String provider,
            String transcribedSnippet) {}

    static TextSignal emptyText() {
        return new TextSignal(0.0, "neutral", List.of(), List.of(), false, false, null, 0.0, "none");
    }

    static VoiceSignal emptyVoice() {
        return new VoiceSignal(0.0, List.of(), 0.5, 0.5, 0.0, "none", null);
    }

    /** Convenience for building deterministic hashes. */
    static double hash01(String s) {
        return (Math.abs(s.hashCode()) % 1000) / 1000.0;
    }

    static double clamp01(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }

    static Map<String, Object> toMap(TextSignal t) {
        return Map.of(
                "distressScore", t.distressScore(),
                "sentiment", t.sentiment(),
                "themes", t.themes(),
                "confidence", t.confidence(),
                "provider", t.provider());
    }
}
