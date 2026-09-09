package com.synora.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Central application configuration bound to the "synora" property namespace.
 */
@ConfigurationProperties(prefix = "synora")
public record SynoraProperties(
        Jwt jwt,
        Cors cors,
        Ai ai,
        Risk risk,
        Alerts alerts,
        Baseline baseline,
        Seed seed) {

    public record Jwt(String secret, long expirationHours) {}

    public record Cors(java.util.List<String> allowedOrigins) {}

    public record Ai(String provider, Ollama ollama) {
        public record Ollama(String baseUrl, String model, long timeoutMs) {}
    }

    public record Risk(
            double thresholdModerate,
            double thresholdHigh,
            double thresholdCritical,
            double alertThreshold,
            double weightText,
            double weightVoice,
            double weightBehavior,
            double weightBaseline,
            double weightTemporal,
            double weightCrossmodal) {}

    public record Alerts(long escalationMinutes) {}

    public record Baseline(int windowDays, int minHistory) {}

    public record Seed(boolean enabled) {}
}
