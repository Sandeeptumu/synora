package com.synora.backend.engine;

import com.synora.backend.monitoring.RiskAssessment;
import com.synora.backend.monitoring.RiskAssessmentRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

import java.util.List;

/**
 * Personal baseline engine: compares current signals against the individual's
 * own historical pattern rather than a population norm.
 */
@Service
public class BaselineEngine {

    private final RiskAssessmentRepository riskRepo;

    public BaselineEngine(RiskAssessmentRepository riskRepo) {
        this.riskRepo = riskRepo;
    }

    public record BaselineResult(double baselineDistress, double currentDistress,
                                 double deviation, String interpretation) {}

    /**
     * Baseline = mean of historical risk scores (excluding the current one).
     * Deviation = current − baseline, clamped to [−1, 1].
     */
    public BaselineResult compute(UUID caseId, double currentRiskScore) {
        List<RiskAssessment> history = riskRepo.findByCaseRefIdOrderByCreatedAtAsc(caseId);
        // History includes the just-persisted current assessment if any; exclude last.
        List<Double> past = history.size() > 1
                ? history.subList(0, history.size() - 1).stream().map(RiskAssessment::getRiskScore).toList()
                : List.of();
        return computeFromHistory(past, currentRiskScore);
    }

    public BaselineResult computeFromHistory(List<Double> pastScores, double currentScore) {
        if (pastScores.isEmpty()) {
            return new BaselineResult(currentScore, currentScore, 0.0,
                    "Insufficient history — establishing initial baseline");
        }
        double mean = pastScores.stream().mapToDouble(Double::doubleValue).average().orElse(currentScore);
        double dev = Math.max(-1.0, Math.min(1.0, currentScore - mean));
        String interp;
        if (dev >= 0.30) interp = "Significant deviation above personal baseline";
        else if (dev >= 0.15) interp = "Moderate deviation above personal baseline";
        else if (dev <= -0.30) interp = "Marked improvement relative to personal baseline";
        else if (dev <= -0.15) interp = "Improving relative to personal baseline";
        else interp = "Within normal personal range";
        return new BaselineResult(round(mean), round(currentScore), round(dev), interp);
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
