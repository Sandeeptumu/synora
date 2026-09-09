package com.synora.backend.ai;

import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Deterministic fallback provider. Always available, no randomness:
 * the same input always yields the same analysis.
 */
@Component
public class DemoAIProvider implements AIProvider {

    private final DeterministicTextAnalyzer textAnalyzer;
    private final DeterministicVoiceAnalyzer voiceAnalyzer;

    public DemoAIProvider(DeterministicTextAnalyzer textAnalyzer, DeterministicVoiceAnalyzer voiceAnalyzer) {
        this.textAnalyzer = textAnalyzer;
        this.voiceAnalyzer = voiceAnalyzer;
    }

    @Override
    public String name() {
        return "demo";
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public TextSignal analyzeText(String text) {
        DeterministicTextAnalyzer.TextResult r = textAnalyzer.analyze(text);
        return new TextSignal(r.distressScore(), r.sentiment(), r.themes(), r.negativeTerms(),
                r.sleepDisruption(), r.urgency(), r.urgencyNote(), r.confidence(), "demo");
    }

    @Override
    public VoiceSignal analyzeVoice(byte[] audio, String contentType) {
        DeterministicVoiceAnalyzer.VoiceResult r = voiceAnalyzer.analyze(audio, contentType);
        return new VoiceSignal(r.distressScore(), r.toneIndicators(), r.energyLevel(), r.speechRate(),
                r.confidence(), "demo", r.transcribedSnippet());
    }

    @Override
    public String summarize(String prompt) {
        return "Demo summary: analysis completed by deterministic local model (Ollama offline).";
    }
}
