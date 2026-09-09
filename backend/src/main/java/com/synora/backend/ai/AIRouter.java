package com.synora.backend.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Routes analysis to the configured provider: prefers Ollama when reachable,
 * otherwise the deterministic demo provider. Provider can be forced via
 * AI_PROVIDER=ollama|demo.
 */
@Service
public class AIRouter {

    private static final Logger log = LoggerFactory.getLogger(AIRouter.class);

    private final OllamaAIProvider ollama;
    private final DemoAIProvider demo;
    private final String mode;

    public AIRouter(OllamaAIProvider ollama, DemoAIProvider demo,
                    com.synora.backend.config.SynoraProperties props) {
        this.ollama = ollama;
        this.demo = demo;
        this.mode = props.ai().provider();
    }

    public String activeProviderName() {
        if ("demo".equalsIgnoreCase(mode)) return "demo";
        if ("ollama".equalsIgnoreCase(mode)) return ollama.isAvailable() ? "ollama" : "demo(fallback)";
        if (ollama.isAvailable()) return "ollama";
        return "demo";
    }

    public boolean ollamaOnline() {
        return !"demo".equalsIgnoreCase(mode) && ollama.isAvailable();
    }

    public AIProvider.TextSignal analyzeText(String text) {
        if (!"demo".equalsIgnoreCase(mode)) {
            try {
                AIProvider.TextSignal r = ollama.analyzeText(text);
                if (r != null) return r;
            } catch (Exception e) {
                log.warn("Ollama unavailable, falling back to demo: {}", e.toString());
            }
        }
        return demo.analyzeText(text);
    }

    public AIProvider.VoiceSignal analyzeVoice(byte[] audio, String contentType) {
        return demo.analyzeVoice(audio, contentType);
    }
}
