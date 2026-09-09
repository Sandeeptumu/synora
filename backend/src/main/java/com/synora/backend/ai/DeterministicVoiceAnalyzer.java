package com.synora.backend.ai;

import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.util.List;

/**
 * Deterministic voice prosody analyzer for the demo provider.
 * Derives stable pseudo-prosody features from audio bytes so the same
 * audio always yields the same signal (no randomness).
 */
@Component
public class DeterministicVoiceAnalyzer {

    public VoiceResult analyze(byte[] audio, String contentType) {
        if (audio == null || audio.length == 0) {
            return new VoiceResult(0.10, List.of(), 0.55, 0.55, 0.3, "empty audio");
        }
        long seed = seedFrom(audio);
        // Pseudo features derived from byte statistics — deterministic.
        double mean = 0;
        for (byte b : audio) mean += (b & 0xFF);
        mean /= audio.length;

        double variance = 0;
        for (byte b : audio) {
            double d = (b & 0xFF) - mean;
            variance += d * d;
        }
        variance /= audio.length;
        double stdDev = Math.sqrt(variance);

        double energy = AIProvider.clamp01(stdDev / 60.0);          // "loudness"
        double variability = AIProvider.clamp01(stdDev / 40.0);      // tremor proxy (roughness)
        double pace = AIProvider.clamp01(0.25 + (seed % 50) / 100.0);

        double distress = AIProvider.clamp01(0.15 + 0.5 * (1 - energy) + 0.2 * variability);

        java.util.List<String> tones = new java.util.ArrayList<>();
        if (variability > 0.45) tones.add("tremor");
        if (energy < 0.35) tones.add("low_energy");
        if (pace < 0.35) tones.add("slow_speech");
        if (pace > 0.75) tones.add("rapid_speech");
        if (tones.isEmpty()) tones.add("steady");

        String snippet = snippetFrom(seed, distress);
        return new VoiceResult(distress, tones, energy, pace, 0.55, snippet);
    }

    private long seedFrom(byte[] audio) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(audio);
            return ((digest[0] & 0xFFL) << 24) | ((digest[1] & 0xFFL) << 16)
                    | ((digest[2] & 0xFFL) << 8) | (digest[3] & 0xFFL);
        } catch (Exception e) {
            return audio.length;
        }
    }

    private String snippetFrom(long seed, double distress) {
        // Demo-mode placeholder transcript (no real ASR in prototype).
        if (distress > 0.6) {
            return (seed % 2 == 0)
                    ? "…I don't feel like myself these days… it's hard to keep going…"
                    : "…everything feels heavy… I can't sleep… I keep replaying it…";
        }
        if (distress > 0.35) {
            return (seed % 2 == 0)
                    ? "…some days are okay, others are harder… I'm managing…"
                    : "…still think about it a lot… sleeping a little better…";
        }
        return (seed % 2 == 0)
                ? "…I'm feeling a bit steadier this week…"
                : "…things are okay… still working through it…";
    }

    public record VoiceResult(double distressScore, List<String> toneIndicators, double energyLevel,
                              double speechRate, double confidence, String transcribedSnippet) {}
}
