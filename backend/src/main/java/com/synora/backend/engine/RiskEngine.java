package com.synora.backend.engine;

import com.synora.backend.config.SynoraProperties;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Explainable weighted risk scoring engine.
 * Components: text, voice, behavior, baseline deviation, temporal trend,
 * cross-modal agreement. Produces factor contributions for explainability.
 */
@Service
public class RiskEngine {

    private final SynoraProperties props;

    public RiskEngine(SynoraProperties props) {
        this.props = props;
    }

    public record RiskInput(
            Double textScore,
            Double voiceScore,
            Double behaviorScore,
            double baselineDeviation,
            double temporalScore,
            double crossModalAgreement) {}

    public record RiskFactor(String factor, String explanation, double contribution) {}

    public record RiskOutput(
            double riskScore,
            String riskLevel,
            double confidence,
            List<RiskFactor> factors) {}

    public RiskOutput evaluate(RiskInput in) {
        SynoraProperties.Risk w = props.risk();
        List<RiskFactor> factors = new ArrayList<>();

        double text = orZero(in.textScore());
        double voice = orZero(in.voiceScore());
        double behavior = orZero(in.behaviorScore());
        double baseline = Math.max(0, in.baselineDeviation());
        double temporal = Math.max(0, in.temporalScore());
        double agreement = in.crossModalAgreement();

        // Weighted components. Weights are normalized by the sum of weights for
        // modalities actually present, so a text-only reading is not diluted by
        // absent voice/behavior signals (data minimization: use what is shared).
        double applied = w.weightText() + w.weightBaseline() + w.weightTemporal() + w.weightCrossmodal();
        double base = text * w.weightText()
                + baseline * w.weightBaseline()
                + temporal * w.weightTemporal();
        if (in.voiceScore() != null) {
            base += voice * w.weightVoice();
            applied += w.weightVoice();
        }
        if (in.behaviorScore() != null) {
            base += behavior * w.weightBehavior();
            applied += w.weightBehavior();
        }

        // Cross-modal adjustment: agreement reinforces the signal when risk is elevated.
        double crossBoost = agreement * Math.max(text, Math.max(voice, behavior)) * w.weightCrossmodal();
        double score = (base + crossBoost) / applied;

        // Factors (only meaningful contributors)
        if (text > 0.25) {
            factors.add(new RiskFactor("negative_emotional_language",
                    "Elevated distress language detected in text", round(text * w.weightText())));
        }
        if (voice > 0.25) {
            factors.add(new RiskFactor("voice_signal_change",
                    "Voice prosody indicates reduced energy or strain", round(voice * w.weightVoice())));
        }
        if (behavior > 0.25) {
            factors.add(new RiskFactor("behavioral_shift",
                    "Interaction pattern changed from personal norm", round(behavior * w.weightBehavior())));
        }
        if (baseline >= 0.15) {
            factors.add(new RiskFactor("baseline_deviation",
                    "Current signals sit above this person's own baseline", round(baseline * w.weightBaseline())));
        }
        if (temporal > 0.1) {
            factors.add(new RiskFactor("temporal_trend",
                    "Risk trajectory is rising over recent interactions", round(temporal * w.weightTemporal())));
        }
        if (agreement >= 0.7) {
            factors.add(new RiskFactor("cross_modal_consistency",
                    "Multiple independent signals agree on the change", round(crossBoost)));
        }
        factors.sort((a, b) -> Double.compare(b.contribution(), a.contribution()));

        String level = levelFor(score);
        double confidence = Math.max(0.4, Math.min(0.92,
                0.55 + agreement * 0.25 + (in.textScore() != null ? 0.08 : 0)));

        return new RiskOutput(round(score), level, round(confidence), factors);
    }

    public String levelFor(double score) {
        SynoraProperties.Risk t = props.risk();
        if (score >= t.thresholdCritical()) return "CRITICAL";
        if (score >= t.thresholdHigh()) return "HIGH";
        if (score >= t.thresholdModerate()) return "MODERATE";
        return "LOW";
    }

    private static double orZero(Double d) {
        return d == null ? 0.0 : d;
    }

    private static double round(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}
