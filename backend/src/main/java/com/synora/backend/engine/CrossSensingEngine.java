package com.synora.backend.engine;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Cross-sensing engine: compares text, voice, behavioral signals,
 * personal baseline and temporal trend to produce agreement/consistency metrics.
 */
@Service
public class CrossSensingEngine {

    /** Agreement across available modalities (1 − normalized pairwise spread). */
    public record CrossSensingResult(
            double signalAgreement,      // 0..1
            String consistencyFlag,      // HIGH | MEDIUM | LOW
            double crossModalDeviation,  // 0..1 average absolute pairwise difference
            int modalitiesCompared) {}

    public CrossSensingResult evaluate(List<Double> modalityScores) {
        List<Double> present = modalityScores.stream().filter(java.util.Objects::nonNull).toList();
        if (present.size() <= 1) {
            return new CrossSensingResult(0.5, "INSUFFICIENT", 0.0, present.size());
        }
        double min = present.stream().min(Double::compare).orElse(0.0);
        double max = present.stream().max(Double::compare).orElse(0.0);
        double spread = max - min;

        // Pairwise mean absolute deviation
        double sum = 0;
        int pairs = 0;
        for (int i = 0; i < present.size(); i++) {
            for (int j = i + 1; j < present.size(); j++) {
                sum += Math.abs(present.get(i) - present.get(j));
                pairs++;
            }
        }
        double crossModalDeviation = pairs > 0 ? sum / pairs : 0.0;

        double agreement = 1.0 - Math.min(1.0, spread);

        String flag;
        if (agreement >= 0.75 && crossModalDeviation <= 0.20) flag = "HIGH";
        else if (agreement >= 0.55) flag = "MEDIUM";
        else flag = "LOW";

        return new CrossSensingResult(round(agreement), flag, round(crossModalDeviation), present.size());
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
