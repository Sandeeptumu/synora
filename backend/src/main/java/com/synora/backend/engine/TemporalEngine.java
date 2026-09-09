package com.synora.backend.engine;

import com.synora.backend.monitoring.RiskAssessment;
import com.synora.backend.monitoring.RiskAssessmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Temporal risk engine: classifies risk trajectory over time.
 */
@Service
public class TemporalEngine {

    private final RiskAssessmentRepository riskRepo;

    public TemporalEngine(RiskAssessmentRepository riskRepo) {
        this.riskRepo = riskRepo;
    }

    public record TemporalResult(double previousScore, double currentScore,
                                 double changeRate, String trend, double temporalScore) {}

    /**
     * Trend classification from the assessment history for a case.
     * STABLE / RISING / DECLINING / VOLATILE.
     */
    public TemporalResult compute(UUID caseId, double currentScore) {
        List<RiskAssessment> history = riskRepo.findByCaseRefIdOrderByCreatedAtAsc(caseId);
        return computeFromHistory(
                history.stream().map(RiskAssessment::getRiskScore).toList(), currentScore);
    }

    public TemporalResult computeFromHistory(List<Double> history, double currentScore) {
        if (history.size() < 2) {
            return new TemporalResult(currentScore, currentScore, 0.0, "STABLE", 0.0);
        }
        // The last element is the current (just-persisted) assessment.
        double previous = history.get(history.size() - 2);
        double before = history.size() >= 3 ? history.get(history.size() - 3) : previous;

        double delta = currentScore - previous;
        double priorDelta = previous - before;
        double changeRate = round(delta);

        String trend;
        boolean divergence = Math.signum(delta) != Math.signum(priorDelta)
                && Math.abs(delta) > 0.05 && Math.abs(priorDelta) > 0.05;
        if (Math.abs(delta) <= 0.03 && Math.abs(priorDelta) <= 0.03) {
            trend = "STABLE";
        } else if (divergence && (Math.abs(delta) > 0.12 || Math.abs(priorDelta) > 0.12)) {
            trend = "VOLATILE";
        } else if (delta > 0.03) {
            trend = "RISING";
        } else if (delta < -0.03) {
            trend = "DECLINING";
        } else {
            trend = "STABLE";
        }

        double temporalScore = switch (trend) {
            case "RISING" -> Math.min(1.0, Math.abs(delta) * 2.0);
            case "VOLATILE" -> 0.55;
            case "DECLINING" -> 0.0;
            default -> 0.0;
        };

        return new TemporalResult(round(previous), round(currentScore), changeRate, trend, temporalScore);
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
