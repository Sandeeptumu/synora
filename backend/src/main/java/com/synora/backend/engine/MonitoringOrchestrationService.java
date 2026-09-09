package com.synora.backend.engine;

import com.synora.backend.ai.AIRouter;
import com.synora.backend.ai.AIProvider;
import com.synora.backend.casehub.Case;
import com.synora.backend.monitoring.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

/**
 * Orchestrates the full analysis pipeline:
 * check-in → text/voice analysis → behavioral → baseline → temporal →
 * cross-sensing → risk scoring → explainability → alerting.
 */
@Service
public class MonitoringOrchestrationService {

    private final AIRouter aiRouter;
    private final CheckInRepository checkInRepo;
    private final TextAnalysisRepository textRepo;
    private final VoiceAnalysisRepository voiceRepo;
    private final BehavioralSignalRepository behaviorRepo;
    private final RiskAssessmentRepository riskRepo;
    private final BaselineEngine baselineEngine;
    private final TemporalEngine temporalEngine;
    private final CrossSensingEngine crossSensingEngine;
    private final RiskEngine riskEngine;
    private final AlertEngine alertEngine;

    public MonitoringOrchestrationService(AIRouter aiRouter,
                                          CheckInRepository checkInRepo,
                                          TextAnalysisRepository textRepo,
                                          VoiceAnalysisRepository voiceRepo,
                                          BehavioralSignalRepository behaviorRepo,
                                          RiskAssessmentRepository riskRepo,
                                          BaselineEngine baselineEngine,
                                          TemporalEngine temporalEngine,
                                          CrossSensingEngine crossSensingEngine,
                                          RiskEngine riskEngine,
                                          AlertEngine alertEngine) {
        this.aiRouter = aiRouter;
        this.checkInRepo = checkInRepo;
        this.textRepo = textRepo;
        this.voiceRepo = voiceRepo;
        this.behaviorRepo = behaviorRepo;
        this.riskRepo = riskRepo;
        this.baselineEngine = baselineEngine;
        this.temporalEngine = temporalEngine;
        this.crossSensingEngine = crossSensingEngine;
        this.riskEngine = riskEngine;
        this.alertEngine = alertEngine;
    }

    /** Full pipeline for a new check-in with text and/or voice. Returns the risk assessment. */
    @Transactional
    public PipelineResult runPipeline(Case c,
                                      String textContent,
                                      MultipartFile voiceFile,
                                      String mood,
                                      Double interactionFrequencyDelta,
                                      Double responseIntervalDelta) {

        // 1. Persist check-in
        CheckIn checkIn = new CheckIn();
        checkIn.setCaseRef(c);
        boolean hasText = textContent != null && !textContent.isBlank();
        boolean hasVoice = voiceFile != null && !voiceFile.isEmpty();
        checkIn.setChannel(hasText && hasVoice ? "MIXED" : hasVoice ? "VOICE" : "TEXT");
        checkIn.setTextContent(hasText ? textContent : null);
        if (hasVoice) {
            checkIn.setVoiceFileName(voiceFile.getOriginalFilename());
            checkIn.setVoiceContentType(voiceFile.getContentType());
        }
        checkIn.setSelfReportedMood(mood);
        checkIn.setInteractionFrequencyDelta(interactionFrequencyDelta);
        checkIn.setResponseIntervalDelta(responseIntervalDelta);
        checkIn.setCreatedAt(java.time.Instant.now());
        checkInRepo.save(checkIn);

        // 2. Text analysis
        AIProvider.TextSignal textSignal = hasText ? aiRouter.analyzeText(textContent) : null;
        TextAnalysis ta = null;
        if (textSignal != null) {
            ta = new TextAnalysis();
            ta.setCheckIn(checkIn);
            ta.setDistressScore(textSignal.distressScore());
            ta.setSentiment(textSignal.sentiment());
            ta.setThemes(String.join(",", textSignal.themes()));
            ta.setEmotionalIndicators(String.join(",", textSignal.emotionalIndicators()));
            ta.setSleepDisruption(textSignal.sleepDisruption());
            ta.setUrgency(textSignal.urgency());
            ta.setUrgencyNote(textSignal.urgencyNote());
            ta.setConfidence(textSignal.confidence());
            ta.setProvider(textSignal.provider());
            ta.setCreatedAt(java.time.Instant.now());
            textRepo.save(ta);
        }

        // 3. Voice analysis
        AIProvider.VoiceSignal voiceSignal = hasVoice
                ? aiRouter.analyzeVoice(safeBytes(voiceFile), voiceContentType(voiceFile))
                : null;
        VoiceAnalysis va = null;
        if (voiceSignal != null) {
            va = new VoiceAnalysis();
            va.setCheckIn(checkIn);
            va.setDistressScore(voiceSignal.distressScore());
            va.setToneIndicators(String.join(",", voiceSignal.toneIndicators()));
            va.setEnergyLevel(voiceSignal.energyLevel());
            va.setSpeechRate(voiceSignal.speechRate());
            va.setConfidence(voiceSignal.confidence());
            va.setProvider(voiceSignal.provider());
            va.setTranscribedSnippet(voiceSignal.transcribedSnippet());
            va.setCreatedAt(java.time.Instant.now());
            voiceRepo.save(va);
        }

        // 4. Behavioral signal from permitted metadata
        BehavioralSignal bs = computeBehavioralSignal(c, checkIn,
                interactionFrequencyDelta, responseIntervalDelta);
        double behaviorScore = bs.getDeviation();

        // 5. Cross-sensing agreement across modalities
        Double textScore = textSignal != null ? textSignal.distressScore() : null;
        Double voiceScore = voiceSignal != null ? voiceSignal.distressScore() : null;
        CrossSensingEngine.CrossSensingResult cross = crossSensingEngine.evaluate(
                java.util.Arrays.asList(textScore, voiceScore, behaviorScore > 0.05 ? behaviorScore : null));

        // 6. Baseline & temporal (history = past assessments for this case)
        List<Double> pastScores = riskRepo.findByCaseRefIdOrderByCreatedAtAsc(c.getId()).stream()
                .map(RiskAssessment::getRiskScore).toList();

        // Pre-compute raw score for baseline/temporal before persisting current assessment
        RiskEngine.RiskOutput pre = riskEngine.evaluate(new RiskEngine.RiskInput(
                textScore, voiceScore, behaviorScore > 0.05 ? behaviorScore : null,
                0.0, 0.0, cross.signalAgreement()));

        BaselineEngine.BaselineResult baseline =
                baselineEngine.computeFromHistory(pastScores, pre.riskScore());
        TemporalEngine.TemporalResult temporal =
                temporalEngine.computeFromHistory(pastScores, pre.riskScore());

        // 7. Final explainable risk scoring
        RiskEngine.RiskOutput out = riskEngine.evaluate(new RiskEngine.RiskInput(
                textScore, voiceScore, behaviorScore > 0.05 ? behaviorScore : null,
                Math.max(0, baseline.deviation()), temporal.temporalScore(), cross.signalAgreement()));

        // 8. Persist risk assessment
        RiskAssessment ra = new RiskAssessment();
        ra.setCaseRef(c);
        ra.setCheckIn(checkIn);
        ra.setRiskScore(out.riskScore());
        ra.setRiskLevel(out.riskLevel());
        ra.setTrend(temporal.trend());
        ra.setTextScore(textScore);
        ra.setVoiceScore(voiceScore);
        ra.setBehaviorScore(behaviorScore > 0.05 ? behaviorScore : null);
        ra.setBaselineDeviation(baseline.deviation());
        ra.setTemporalScore(temporal.temporalScore());
        ra.setCrossModalAgreement(cross.signalAgreement());
        ra.setSignalAgreement(cross.signalAgreement());
        ra.setConsistencyFlag(cross.consistencyFlag());
        ra.setProvider(aiRouter.activeProviderName());
        ra.setCreatedAt(java.time.Instant.now());
        riskRepo.save(ra);

        // 9. Alerting
        List<String> signals = new ArrayList<>();
        if (textScore != null) signals.add("TEXT");
        if (voiceScore != null) signals.add("VOICE");
        if (behaviorScore > 0.05) signals.add("BEHAVIOR");
        if ("RISING".equals(temporal.trend()) || "VOLATILE".equals(temporal.trend())) signals.add("TREND");
        Alert alert = alertEngine.maybeCreateAlert(c, ra, signals);

        return new PipelineResult(checkIn, ta, va, bs, ra, baseline, temporal, cross, out, alert);
    }

    /** Behavioral signal from permitted deltas or inferred from check-in cadence. */
    private BehavioralSignal computeBehavioralSignal(Case c, CheckIn checkIn,
                                                     Double freqDelta, Double intervalDelta) {
        List<CheckIn> history = checkInRepo.findByCaseRefIdOrderByCreatedAtAsc(c.getId());
        BehavioralSignal bs = new BehavioralSignal();
        bs.setCaseRef(c);
        bs.setCheckIn(checkIn);

        // Baseline cadence from prior check-ins (this one included; minus 1 for itself)
        int priorCount = Math.max(0, history.size() - 1);
        double baselineFreq = priorCount > 0 ? Math.max(0.5, priorCount / 30.0 * 3.0) : 3.0;
        double baselineInterval = priorCount > 1 ? 48.0 : 24.0;

        double freq = freqDelta != null ? Math.max(0, baselineFreq + freqDelta) : baselineFreq;
        double interval = intervalDelta != null ? Math.max(1, baselineInterval + intervalDelta) : baselineInterval;

        bs.setBaselineInteractionFrequency(round2(baselineFreq));
        bs.setBaselineResponseIntervalHours(round2(baselineInterval));
        bs.setInteractionFrequency(round2(freq));
        bs.setResponseIntervalHours(round2(interval));

        double freqDrop = baselineFreq > 0 ? Math.max(0, (baselineFreq - freq) / baselineFreq) : 0;
        double intervalGrowth = baselineInterval > 0
                ? Math.max(0, (interval - baselineInterval) / baselineInterval) : 0;
        double dev = Math.min(1.0, 0.6 * freqDrop + 0.4 * intervalGrowth);
        bs.setDeviation(round2(dev));

        List<String> indicators = new ArrayList<>();
        if (freqDrop > 0.2) indicators.add("reduced_interaction_frequency");
        if (intervalGrowth > 0.2) indicators.add("longer_response_intervals");
        if (indicators.isEmpty()) indicators.add("no_significant_change");
        bs.setIndicators(String.join(",", indicators));
        bs.setCreatedAt(java.time.Instant.now());
        return behaviorRepo.save(bs);
    }

    private byte[] safeBytes(MultipartFile f) {
        try {
            return f.getBytes();
        } catch (Exception e) {
            return new byte[0];
        }
    }

    private String voiceContentType(MultipartFile f) {
        return f.getContentType() != null ? f.getContentType() : "audio/webm";
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    public record PipelineResult(CheckIn checkIn, TextAnalysis textAnalysis, VoiceAnalysis voiceAnalysis,
                                 BehavioralSignal behavioralSignal, RiskAssessment riskAssessment,
                                 BaselineEngine.BaselineResult baseline,
                                 TemporalEngine.TemporalResult temporal,
                                 CrossSensingEngine.CrossSensingResult cross,
                                 RiskEngine.RiskOutput riskOutput,
                                 Alert alert) {}
}
