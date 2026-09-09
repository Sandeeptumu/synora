package com.synora.backend;

import com.synora.backend.ai.DemoAIProvider;
import com.synora.backend.ai.DeterministicTextAnalyzer;
import com.synora.backend.ai.DeterministicVoiceAnalyzer;
import com.synora.backend.engine.BaselineEngine;
import com.synora.backend.engine.CrossSensingEngine;
import com.synora.backend.engine.RiskEngine;
import com.synora.backend.engine.TemporalEngine;
import com.synora.backend.monitoring.RiskAssessmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

/**
 * Fast unit tests for the deterministic AI and risk engines.
 * No Spring context, no database — run anywhere with `mvn test`.
 */
class BackendApplicationTests {

    private DeterministicTextAnalyzer textAnalyzer;
    private DemoAIProvider demoProvider;
    private BaselineEngine baselineEngine;
    private TemporalEngine temporalEngine;
    private CrossSensingEngine crossSensingEngine;
    private RiskEngine riskEngine;

    @BeforeEach
    void setUp() {
        textAnalyzer = new DeterministicTextAnalyzer();
        demoProvider = new DemoAIProvider(textAnalyzer, new DeterministicVoiceAnalyzer());
        baselineEngine = new BaselineEngine(mock(RiskAssessmentRepository.class));
        temporalEngine = new TemporalEngine(mock(RiskAssessmentRepository.class));
        crossSensingEngine = new CrossSensingEngine();
        riskEngine = new RiskEngine(new com.synora.backend.config.SynoraProperties(
                null, null, null,
                new com.synora.backend.config.SynoraProperties.Risk(0.30, 0.60, 0.80, 0.60,
                        0.28, 0.20, 0.16, 0.14, 0.10, 0.12),
                null, null, null));
    }

    @Test
    @DisplayName("Text analysis is deterministic: same input → same output")
    void textAnalysisIsDeterministic() {
        var a = textAnalyzer.analyze("I feel numb and can't sleep at night. Everything feels heavy.");
        var b = textAnalyzer.analyze("I feel numb and can't sleep at night. Everything feels heavy.");
        assertEquals(a.distressScore(), b.distressScore());
        assertEquals(a.themes(), b.themes());
        assertEquals(a.sentiment(), b.sentiment());
    }

    @Test
    @DisplayName("Distressed text scores higher than calm text and is negative")
    void distressedTextScoresHigher() {
        var calm = textAnalyzer.analyze("Feeling okay today. Slept well and things are calm. Grateful for the support.");
        var low = textAnalyzer.analyze("I feel hopeless and alone. I cannot sleep. Everything feels pointless.");
        assertTrue(low.distressScore() > calm.distressScore(),
                "low=" + low.distressScore() + " calm=" + calm.distressScore());
        assertEquals("negative", low.sentiment());
    }

    @Test
    @DisplayName("Urgent phrasing lifts the score substantially")
    void urgentTextIsElevated() {
        var r = textAnalyzer.analyze("I can't take this anymore. I don't see any point in continuing.");
        assertTrue(r.distressScore() >= 0.6, "score=" + r.distressScore());
        assertTrue(r.urgency());
    }

    @Test
    @DisplayName("Blank text yields a safe neutral result")
    void blankTextIsSafe() {
        var r = textAnalyzer.analyze("");
        assertNotNull(r);
        assertFalse(r.urgency());
        assertTrue(r.distressScore() < 0.2);
    }

    @Test
    @DisplayName("Voice analysis is deterministic for identical audio bytes")
    void voiceAnalysisIsDeterministic() {
        byte[] audio = new byte[2048];
        for (int i = 0; i < audio.length; i++) audio[i] = (byte) ((i * 37) % 256 - 128);
        var a = demoProvider.analyzeVoice(audio, "audio/webm");
        var b = demoProvider.analyzeVoice(audio, "audio/webm");
        assertEquals(a.distressScore(), b.distressScore());
        assertEquals(a.toneIndicators(), b.toneIndicators());
        assertTrue(a.distressScore() >= 0 && a.distressScore() <= 1);
    }

    @Test
    @DisplayName("Empty voice audio returns a safe low signal, not an exception")
    void emptyVoiceIsSafe() {
        var r = demoProvider.analyzeVoice(new byte[0], "audio/webm");
        assertNotNull(r);
        assertTrue(r.distressScore() >= 0 && r.distressScore() <= 1);
    }

    @Test
    @DisplayName("Baseline: no history → zero deviation")
    void baselineWithoutHistory() {
        var r = baselineEngine.computeFromHistory(List.of(), 0.5);
        assertEquals(0.0, r.deviation());
        assertTrue(r.interpretation().contains("Insufficient"));
    }

    @Test
    @DisplayName("Baseline: current above history → positive deviation")
    void baselineDeviationAbove() {
        var r = baselineEngine.computeFromHistory(List.of(0.2, 0.25, 0.3), 0.62);
        assertTrue(r.deviation() > 0.25, "deviation=" + r.deviation());
        assertTrue(r.interpretation().contains("Significant"));
    }

    @Test
    @DisplayName("Temporal: rising sequence classifies as RISING")
    void temporalRising() {
        var r = temporalEngine.computeFromHistory(List.of(0.3, 0.35), 0.55);
        assertEquals("RISING", r.trend());
        assertTrue(r.temporalScore() > 0);
    }

    @Test
    @DisplayName("Temporal: declining sequence classifies as DECLINING")
    void temporalDeclining() {
        var r = temporalEngine.computeFromHistory(List.of(0.6, 0.55), 0.35);
        assertEquals("DECLINING", r.trend());
        assertEquals(0.0, r.temporalScore());
    }

    @Test
    @DisplayName("Cross-sensing: agreeing signals → HIGH consistency")
    void crossSensingHighAgreement() {
        var r = crossSensingEngine.evaluate(List.of(0.72, 0.68, 0.70));
        assertEquals("HIGH", r.consistencyFlag());
        assertTrue(r.signalAgreement() >= 0.75);
        assertEquals(3, r.modalitiesCompared());
    }

    @Test
    @DisplayName("Cross-sensing: divergent signals → LOW consistency")
    void crossSensingLowAgreement() {
        var r = crossSensingEngine.evaluate(List.of(0.9, 0.1, 0.5));
        assertEquals("LOW", r.consistencyFlag());
    }

    @Test
    @DisplayName("Cross-sensing: single modality → INSUFFICIENT, no crash")
    void crossSensingInsufficient() {
        var r = crossSensingEngine.evaluate(java.util.Arrays.asList(0.7, null, null));
        assertEquals("INSUFFICIENT", r.consistencyFlag());
    }

    @Test
    @DisplayName("Risk engine: text-only input is NOT diluted by absent modalities")
    void textOnlyNotDiluted() {
        var out = riskEngine.evaluate(new RiskEngine.RiskInput(0.8, null, null, 0.2, 0.1, 0.6));
        // Naive fixed weighting would dilute 0.8 text to ~0.30. Normalization keeps it strong.
        assertTrue(out.riskScore() >= 0.45, "score=" + out.riskScore());
        assertTrue(out.riskScore() > 0.35, "must exceed the diluted equivalent (0.30)");
        assertTrue(out.riskLevel().equals("HIGH") || out.riskLevel().equals("MODERATE"));
        assertFalse(out.factors().isEmpty(), "explainability factors must exist");
    }

    @Test
    @DisplayName("Risk engine: all modalities present scores higher than any single one")
    void fullModalitiesAmplify() {
        var single = riskEngine.evaluate(new RiskEngine.RiskInput(0.6, null, null, 0.0, 0.0, 0.5));
        var full = riskEngine.evaluate(new RiskEngine.RiskInput(0.6, 0.6, 0.6, 0.3, 0.3, 0.8));
        assertTrue(full.riskScore() > single.riskScore());
    }

    @Test
    @DisplayName("Risk levels follow configured thresholds")
    void riskLevelsMatchThresholds() {
        assertEquals("LOW", riskEngine.levelFor(0.1));
        assertEquals("MODERATE", riskEngine.levelFor(0.4));
        assertEquals("HIGH", riskEngine.levelFor(0.7));
        assertEquals("CRITICAL", riskEngine.levelFor(0.9));
    }

    @Test
    @DisplayName("Risk scores stay within 0..1 for edge inputs")
    void riskScoreBounded() {
        var max = riskEngine.evaluate(new RiskEngine.RiskInput(1.0, 1.0, 1.0, 1.0, 1.0, 1.0));
        var min = riskEngine.evaluate(new RiskEngine.RiskInput(0.0, 0.0, 0.0, 0.0, 0.0, 0.0));
        assertTrue(max.riskScore() <= 1.0 && max.riskScore() >= 0.0);
        assertTrue(min.riskScore() <= 1.0 && min.riskScore() >= 0.0);
        assertTrue(UUID.fromString("00000000-0000-0000-0000-000000000000") != null); // sanity
    }
}
