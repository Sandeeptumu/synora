package com.synora.backend.config;

import com.synora.backend.ai.AIRouter;
import com.synora.backend.casehub.Case;
import com.synora.backend.casehub.CaseRepository;
import com.synora.backend.engine.BaselineEngine;
import com.synora.backend.engine.CrossSensingEngine;
import com.synora.backend.engine.RiskEngine;
import com.synora.backend.engine.TemporalEngine;
import com.synora.backend.monitoring.*;
import com.synora.backend.user.User;
import com.synora.backend.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Seeds synthetic demo data on first boot. No real victim data.
 * Deterministic: builds histories so dashboards look populated and alive.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository userRepo;
    private final CaseRepository caseRepo;
    private final RiskAssessmentRepository riskRepo;
    private final AlertRepository alertRepo;
    private final FollowUpRepository followUpRepo;
    private final InterventionRepository interventionRepo;
    private final CheckInRepository checkInRepo;
    private final TextAnalysisRepository textRepo;
    private final VoiceAnalysisRepository voiceRepo;
    private final BehavioralSignalRepository behaviorRepo;
    private final ConsentRepository consentRepo;
    private final ResourceRepository resourceRepo;
    private final com.synora.backend.audit.AuditLogRepository auditRepo;
    private final com.synora.backend.engine.MonitoringOrchestrationService orchestration;
    private final AIRouter aiRouter;
    private final PasswordEncoder encoder;
    private final SynoraProperties props;

    public DemoDataSeeder(UserRepository userRepo, CaseRepository caseRepo,
                          RiskAssessmentRepository riskRepo, AlertRepository alertRepo,
                          FollowUpRepository followUpRepo, InterventionRepository interventionRepo,
                          CheckInRepository checkInRepo, TextAnalysisRepository textRepo,
                          VoiceAnalysisRepository voiceRepo, BehavioralSignalRepository behaviorRepo,
                          ConsentRepository consentRepo, ResourceRepository resourceRepo,
                          com.synora.backend.audit.AuditLogRepository auditRepo,
                          com.synora.backend.engine.MonitoringOrchestrationService orchestration,
                          AIRouter aiRouter, PasswordEncoder encoder, SynoraProperties props) {
        this.userRepo = userRepo;
        this.caseRepo = caseRepo;
        this.riskRepo = riskRepo;
        this.alertRepo = alertRepo;
        this.followUpRepo = followUpRepo;
        this.interventionRepo = interventionRepo;
        this.checkInRepo = checkInRepo;
        this.textRepo = textRepo;
        this.voiceRepo = voiceRepo;
        this.behaviorRepo = behaviorRepo;
        this.consentRepo = consentRepo;
        this.resourceRepo = resourceRepo;
        this.auditRepo = auditRepo;
        this.orchestration = orchestration;
        this.aiRouter = aiRouter;
        this.encoder = encoder;
        this.props = props;
    }

    private static final String DEMO_PASSWORD = "Demo@12345";

    private static final String[] FIRST_NAMES = {
            "Aarav", "Meera", "Kiran", "Ananya", "Rohan", "Divya", "Vikram", "Priya", "Arjun", "Sneha",
            "Rahul", "Ishita", "Karthik", "Nisha", "Dev", "Tara", "Aditya", "Pooja", "Nikhil", "Riya",
            "Sameer", "Kavya", "Manoj", "Lakshmi", "Farhan", "Zoya", "Imran", "Sana", "Joseph", "Elena"};
    private static final String[] LAST_NAMES = {
            "Sharma", "Iyer", "Reddy", "Nair", "Patel", "Singh", "Das", "Kulkarni", "Menon", "Bose",
            "Verma", "Rao", "Joshi", "Pillai", "Chatterjee"};
    private static final String[] REGIONS = {
            "North District", "South District", "East District", "West District", "Central Zone"};
    private static final String[] CATEGORIES = {
            "Atrocity Complaint", "Harassment Case", "Discrimination Grievance",
            "Community Dispute", "Property Rights", "Rehabilitation Support"};
    private static final String[] STATUSES = {"OPEN", "IN_PROGRESS", "MONITORING", "CLOSED"};

    // Text templates by distress band (low → critical)
    private static final String[][] TEXT_TEMPLATES = {
            { // low
                "Feeling okay today. Work was busy but manageable. Thank you for checking in.",
                "Slept better last night. Things feel a little calmer this week.",
                "Had a good call with my sister. Feeling hopeful about the hearing next month.",
                "Nothing new to report. Feeling steady and grateful for the support."},
            { // moderate
                "Some days are harder than others. Sleeping okay but still worried about the case.",
                "Feeling anxious about the upcoming hearing. Keeping busy helps a little.",
                "Tired most evenings. Hard to focus but I'm managing.",
                "Thoughts keep drifting back to that day. It helps to write this down."},
            { // high
                "I feel numb and can't sleep at night. Everything feels heavy and pointless lately.",
                "Barely sleeping. I feel alone even in a room full of people. Don't know who to talk to.",
                "The nightmares are back every night. I can't stop replaying everything.",
                "I stopped going out. No energy, no appetite. I feel trapped in my own head."},
            { // critical
                "I can't take this anymore. I don't see any point in continuing like this.",
                "Every night I think about ending it. Nobody would even notice for days.",
                "I have nothing left. I'm done fighting. Please tell my family I tried."},
    };

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!props.seed().enabled()) return;
        if (userRepo.count() > 0) {
            log.info("[Synora] Demo data already present ({} users) — skipping seed", userRepo.count());
            return;
        }

        log.info("[Synora] Seeding demo data…");
        long t0 = System.currentTimeMillis();
        Random rnd = new Random(42); // deterministic

        // ---- Demo staff accounts ----
        User admin = mkUser("admin@demo.synora.ai", "ADMIN", "Dr. Meenakshi Rao", "System Administrator",
                "Synora Justice & Health", "Platform Governance", List.of(), "", List.of());
        User officer = mkUser("officer@demo.synora.ai", "CASE_OFFICER", "Vikram Malhotra", "Senior Case Officer",
                "District Support Office", "Case Management", List.of("en","hi"), "en", List.of("Case Management","Safeguarding"));
        User officer2 = mkUser("officer2@demo.synora.ai", "CASE_OFFICER", "Sunita Deshmukh", "Case Officer",
                "District Support Office", "Case Management", List.of("en","hi","te"), "te", List.of("Case Management"));
        User counselor = mkUser("counselor@demo.synora.ai", "COUNSELOR", "Dr. Anjali Krishnan", "Lead Counselor",
                "Synora Care Network", "Trauma-informed Counseling", List.of("en","te","hi"), "en", List.of("Trauma","Anxiety","Stress"));
        User counselor2 = mkUser("counselor2@demo.synora.ai", "COUNSELOR", "Dr. Ramesh Gupta", "Counselor",
                "Synora Care Network", "Clinical Psychology", List.of("en","ta","hi"), "en", List.of("Clinical Psychology","Anxiety"));
        User counselor3 = mkUser("counselor3@demo.synora.ai", "COUNSELOR", "Fatima Sheikh", "Counselor",
                "Community Wellness Org", "Victim Support", List.of("en","ur","pa"), "en", List.of("Victim Support","Grief","Family"));
        User victim = mkUser("user@demo.synora.ai", "VICTIM", "Aarav Sharma", null, null, null, List.of("en","te","hi"), "te", List.of());

        List<User> counselors = List.of(counselor, counselor2, counselor3);
        List<User> officers = List.of(officer, officer2);

        // ---- Consents for the demo victim ----
        for (String modality : List.of("TEXT_ANALYSIS", "VOICE_ANALYSIS", "BEHAVIORAL_ANALYSIS")) {
            Consent c = new Consent();
            c.setUser(victim);
            c.setModality(modality);
            c.setGranted(true);
            c.setGrantedAt(Instant.now().minus(60, ChronoUnit.DAYS));
            consentRepo.save(c);
        }

        // ---- Resources ----
        seedResources();

        // ---- Cases ----
        int totalVictims = 126; // + 1 named victim = 127 victims → 128 cases incl. demo
        List<Case> allCases = new ArrayList<>();
        long caseNum = 2001;

        // Demo victim's own case: CASE-2031 with a rich trajectory (demo highlight)
        Case demoCase = createCase(victim, "CASE-2031", "Atrocity Complaint",
                "Support and monitoring for complaint filed in March", "North District",
                counselor, officer, "IN_PROGRESS");
        seedAudit(demoCase, counselor);
        buildTrajectory(demoCase, 2.2, 0.72, rnd);   // rising distress, high risk
        allCases.add(demoCase);

        // Other named demo cases from the brief
        Case c2042 = createCase(mkVictim("Meera Iyer"), "CASE-2042", "Harassment Case",
                "Workplace harassment complaint, monitoring phase", "South District",
                counselor2, officer, "MONITORING");
        buildTrajectory(c2042, 1.8, 0.45, rnd);      // moderate, declining
        allCases.add(c2042);

        Case c2057 = createCase(mkVictim("Kiran Reddy"), "CASE-2057", "Rehabilitation Support",
                "Post-hearing rehabilitation support", "East District",
                counselor3, officer2, "MONITORING");
        buildTrajectory(c2057, 2.0, 0.25, rnd);      // low, stable
        allCases.add(c2057);

        Case c2071 = createCase(mkVictim("Ananya Nair"), "CASE-2071", "Atrocity Complaint",
                "Critical case requiring immediate review", "West District",
                counselor, officer2, "IN_PROGRESS");
        buildTrajectory(c2071, 1.5, 0.88, rnd);      // critical
        allCases.add(c2071);

        // Background population
        for (int i = 0; i < totalVictims; i++) {
            String name = FIRST_NAMES[rnd.nextInt(FIRST_NAMES.length)] + " "
                    + LAST_NAMES[rnd.nextInt(LAST_NAMES.length)];
            User v = mkVictim(name);
            long n = caseNum + 50 + i * 3 + rnd.nextInt(3);
            String caseNumber = String.format("CASE-%04d", n);
            if (caseRepo.findByCaseNumberIgnoreCase(caseNumber).isPresent()) continue;

            // Risk archetype distribution: ~53% low, 33% moderate, 11% high, 3% critical
            double roll = rnd.nextDouble();
            double target = roll < 0.53 ? 0.05 + rnd.nextDouble() * 0.22
                    : roll < 0.86 ? 0.32 + rnd.nextDouble() * 0.25
                    : roll < 0.97 ? 0.62 + rnd.nextDouble() * 0.16
                    : 0.82 + rnd.nextDouble() * 0.15;

            double slope = (rnd.nextDouble() - 0.45) * 0.25; // mostly gentle trends
            Case c = createCase(v, caseNumber, CATEGORIES[rnd.nextInt(CATEGORIES.length)],
                    "Synthetic case for platform demonstration", REGIONS[rnd.nextInt(REGIONS.length)],
                    counselors.get(rnd.nextInt(counselors.size())),
                    officers.get(rnd.nextInt(officers.size())),
                    STATUSES[rnd.nextInt(100) < 12 ? 3 : rnd.nextInt(3)]);
            buildTrajectory(c, 1.0 + rnd.nextDouble() * 1.5, target, slope != 0 ? slope : 0.02, rnd);
            allCases.add(c);
        }

        // ---- Alerts for high-risk cases ----
        int alertCount = 0;
        for (Case c : allCases) {
            var latest = riskRepo.findFirstByCaseRefIdOrderByCreatedAtDesc(c.getId());
            if (latest.isPresent() && latest.get().getRiskScore() >= props.risk().alertThreshold()) {
                Alert a = new Alert();
                a.setCaseRef(c);
                a.setRiskAssessment(latest.get());
                a.setSeverity(latest.get().getRiskScore() >= props.risk().thresholdCritical()
                        ? "CRITICAL" : "HIGH");
                boolean resolved = rnd.nextInt(10) < 3;
                a.setStatus(resolved ? "RESOLVED" : rnd.nextInt(10) < 5 ? "OPEN" : "ACKNOWLEDGED");
                a.setRiskScore(latest.get().getRiskScore());
                List<String> sig = new ArrayList<>();
                if (latest.get().getTextScore() != null) sig.add("TEXT");
                if (latest.get().getVoiceScore() != null) sig.add("VOICE");
                sig.add("TREND");
                a.setSignalsTriggered(String.join(",", sig));
                a.setTitle(a.getSeverity() + "-RISK SIGNAL DETECTED");
                a.setEscalated(!resolved && rnd.nextInt(10) < 3);
                if ("ACKNOWLEDGED".equals(a.getStatus())) {
                    a.setAcknowledgedBy(c.getAssignedCounselor() != null
                            ? c.getAssignedCounselor().getEmail() : officer.getEmail());
                    a.setAcknowledgedAt(Instant.now().minus(rnd.nextInt(48), ChronoUnit.HOURS));
                }
                if (resolved) {
                    a.setResolvedBy(c.getAssignedCounselor() != null
                            ? c.getAssignedCounselor().getEmail() : officer.getEmail());
                    a.setResolvedAt(Instant.now().minus(rnd.nextInt(72), ChronoUnit.HOURS));
                    a.setResolutionNote("Counselor reviewed, support session scheduled and completed.");
                }
                alertRepo.save(a);
                alertCount++;
            }
        }

        // ---- Follow-ups ----
        for (int i = 0; i < 22; i++) {
            Case c = allCases.get(rnd.nextInt(allCases.size()));
            if (c.getStatus().equals("CLOSED")) continue;
            FollowUp fu = new FollowUp();
            fu.setCaseRef(c);
            int dayOffset = rnd.nextInt(14) - 7; // -7..+6 days
            fu.setDueDate(LocalDate.now().plusDays(dayOffset));
            fu.setType(List.of("CALL", "SESSION", "CHECK_IN", "VISIT").get(rnd.nextInt(4)));
            int r = rnd.nextInt(10);
            fu.setStatus(dayOffset < -2 && r < 6 ? "COMPLETED" : dayOffset < -2 ? "MISSED"
                    : dayOffset <= 0 && r < 8 ? "COMPLETED" : "SCHEDULED");
            if ("COMPLETED".equals(fu.getStatus())) {
                fu.setCompletedAt(Instant.now().minus(rnd.nextInt(120), ChronoUnit.HOURS));
            }
            fu.setNotes("Routine follow-up scheduled by support team");
            fu.setCreatedBy(c.getAssignedCounselor() != null
                    ? c.getAssignedCounselor().getEmail() : officer.getEmail());
            followUpRepo.save(fu);
        }

        // ---- Interventions ----
        String[] IV_TYPES = {"COUNSELING_SESSION", "SUPPORT_CALL", "SAFETY_PLAN", "REFERRAL"};
        String[] IV_NOTES = {
                "Initial counseling session conducted. Beneficiary stable, psychoeducation provided.",
                "Weekly support call. Mood reported improved after case hearing was rescheduled.",
                "Safety plan reviewed and updated with beneficiary and family.",
                "Referred to community legal aid partner for next hearing.",
                "Follow-up counseling session. Sleep hygiene techniques introduced.",
                "Support group orientation completed. Beneficiary responded positively."};
        for (int i = 0; i < 30; i++) {
            Case c = allCases.get(rnd.nextInt(allCases.size()));
            if (c.getStatus().equals("CLOSED")) continue;
            Intervention iv = new Intervention();
            iv.setCaseRef(c);
            iv.setCounselorEmail(c.getAssignedCounselor() != null
                    ? c.getAssignedCounselor().getEmail() : counselor.getEmail());
            iv.setType(IV_TYPES[rnd.nextInt(IV_TYPES.length)]);
            iv.setNotes(IV_NOTES[rnd.nextInt(IV_NOTES.length)]);
            iv.setOutcome(rnd.nextInt(10) < 7 ? "Positive engagement" : "Follow-up required");
            interventionRepo.save(iv);
        }

        // ---- Audit trail seeds ----
        String[] ACTIONS = {"LOGIN", "CASE_CREATED", "CASE_VIEWED", "CASE_ASSIGNED", "RISK_VIEWED",
                "ALERT_CREATED", "ALERT_ACKNOWLEDGED", "ALERT_RESOLVED", "INTERVENTION_RECORDED",
                "FOLLOWUP_CREATED", "USER_UPDATED"};
        for (int i = 0; i < 60; i++) {
            com.synora.backend.audit.AuditLog al = new com.synora.backend.audit.AuditLog();
            al.setAction(ACTIONS[rnd.nextInt(ACTIONS.length)]);
            al.setResourceType(rnd.nextInt(2) == 0 ? "CASE" : "USER");
            al.setActor(List.of(counselor.getEmail(), officer.getEmail(), admin.getEmail(),
                    counselor2.getEmail()).get(rnd.nextInt(4)));
            al.setDetails("Seeded system event " + (i + 1));
            al.setCreatedAt(Instant.now().minus(rnd.nextInt(30), ChronoUnit.DAYS));
            auditRepo.save(al);
        }

        log.info("[Synora] Seed complete in {} ms — {} users, {} cases, {} risk assessments, {} alerts",
                System.currentTimeMillis() - t0, userRepo.count(), caseRepo.count(),
                riskRepo.count(), alertCount);
    }

    // ---------- helpers ----------

    private User mkUser(String email, String role, String name, String title,
                        String org, String spec, List<String> languages, String primaryLanguage,
                        List<String> specialisations) {
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(DEMO_PASSWORD));
        u.setRole(role);
        u.setFullName(title != null ? title : name);
        u.setOrganization(org);
        u.setSpecialisation(spec);
        u.setLanguageCodes(languages);
        u.setPrimaryLanguage(primaryLanguage);
        u.setSpecialisations(specialisations);
        return userRepo.save(u);
    }

    private int victimCounter = 0;

    private User mkVictim(String name) {
        victimCounter++;
        String slug = name.toLowerCase(Locale.ROOT).replace(' ', '.') + "." + victimCounter;
        User u = new User();
        u.setEmail(slug + "@demo.synora.ai");
        u.setPasswordHash(encoder.encode(DEMO_PASSWORD));
        u.setRole("VICTIM");
        u.setFullName(name);
        return userRepo.save(u);
    }

    private Case createCase(User victim, String caseNumber, String category, String title,
                            String region, User counselor, User officer, String status) {
        Case c = new Case();
        c.setCaseNumber(caseNumber);
        c.setTitle(title);
        c.setCategory(category);
        c.setRegion(region);
        c.setSummary("Synthetic demo case — no real beneficiary data.");
        c.setStatus(status);
        c.setPriority("HIGH".equalsIgnoreCase(status) ? "HIGH" : "MEDIUM");
        c.setVictim(victim);
        c.setAssignedCounselor(counselor);
        c.setAssignedOfficer(officer);
        return caseRepo.save(c);
    }

    /**
     * Builds a realistic multi-week trajectory of check-ins + risk assessments
     * ending at approximately the target risk score.
     */
    private void buildTrajectory(Case c, double weeks, double targetRisk, Random rnd) {
        buildTrajectory(c, weeks, targetRisk, 0.0, rnd);
    }

    private void buildTrajectory(Case c, double weeks, double targetRisk, double slope, Random rnd) {
        int points = (int) Math.max(3, Math.round(weeks * 2.5));
        Instant start = Instant.now().minus((long) (weeks * 7 * 24), ChronoUnit.HOURS);
        int band = targetRisk < 0.30 ? 0 : targetRisk < 0.60 ? 1 : targetRisk < 0.80 ? 2 : 3;
        double previous = 0.0;

        for (int i = 0; i < points; i++) {
            double progress = (double) i / Math.max(1, points - 1);
            double baseScore = clamp01(targetRisk - slope * (1 - progress) * 0.6
                    + (rnd.nextDouble() - 0.5) * 0.06);
            Instant at = start.plus((long) (i * weeks * 7 * 24.0 / points), ChronoUnit.HOURS);

            // Check-in with band-appropriate text
            String[] templates = TEXT_TEMPLATES[band];
            String text = templates[rnd.nextInt(templates.length)];

            CheckIn ci = new CheckIn();
            ci.setCaseRef(c);
            ci.setChannel(rnd.nextInt(10) < 6 ? "TEXT" : "MIXED");
            ci.setTextContent(text);
            ci.setSelfReportedMood(band == 0 ? "okay" : band == 1 ? "anxious" : "low");
            ci.setCreatedAt(at);
            checkInRepo.save(ci);

            // Text analysis (deterministic analyzer, adjusted timestamp)
            var textSignal = aiRouter.analyzeText(text);
            TextAnalysis ta = new TextAnalysis();
            ta.setCheckIn(ci);
            ta.setDistressScore(textSignal.distressScore());
            ta.setSentiment(textSignal.sentiment());
            ta.setThemes(String.join(",", textSignal.themes()));
            ta.setEmotionalIndicators(String.join(",", textSignal.emotionalIndicators()));
            ta.setSleepDisruption(textSignal.sleepDisruption());
            ta.setUrgency(textSignal.urgency());
            ta.setConfidence(textSignal.confidence());
            ta.setProvider("demo-seed");
            ta.setCreatedAt(at);
            textRepo.save(ta);

            // Synthetic voice analysis for ~half the points
            Double voiceScore = null;
            if (rnd.nextInt(10) < 5) {
                voiceScore = clamp01(baseScore + (rnd.nextDouble() - 0.4) * 0.15);
                VoiceAnalysis va = new VoiceAnalysis();
                va.setCheckIn(ci);
                va.setDistressScore(round2(voiceScore));
                va.setToneIndicators(voiceScore > 0.55 ? "tremor,low_energy"
                        : voiceScore > 0.35 ? "low_energy" : "steady");
                va.setEnergyLevel(round2(clamp01(0.8 - voiceScore * 0.5)));
                va.setSpeechRate(round2(0.3 + rnd.nextDouble() * 0.4));
                va.setConfidence(0.55);
                va.setProvider("demo-seed");
                va.setTranscribedSnippet("…(synthetic demo transcript)…");
                va.setCreatedAt(at);
                voiceRepo.save(va);
            }

            // Behavioral signal
            double freqDrop = Math.max(0, band * 0.18 - 0.05 + (rnd.nextDouble() - 0.5) * 0.1);
            BehavioralSignal bs = new BehavioralSignal();
            bs.setCaseRef(c);
            bs.setCheckIn(ci);
            bs.setBaselineInteractionFrequency(3.0);
            bs.setBaselineResponseIntervalHours(24.0);
            bs.setInteractionFrequency(round2(Math.max(0.5, 3.0 - freqDrop * 3.0)));
            bs.setResponseIntervalHours(round2(24.0 + freqDrop * 40.0));
            bs.setDeviation(round2(Math.min(1, freqDrop * 1.6)));
            bs.setIndicators(freqDrop > 0.2 ? "reduced_interaction_frequency,longer_response_intervals"
                    : "no_significant_change");
            bs.setCreatedAt(at);
            behaviorRepo.save(bs);

            // Risk assessment
            RiskAssessment ra = new RiskAssessment();
            ra.setCaseRef(c);
            ra.setCheckIn(ci);
            ra.setRiskScore(round2(baseScore));
            ra.setRiskLevel(levelFor(baseScore));
            ra.setTrend(i == 0 ? "STABLE"
                    : baseScore > previous + 0.03 ? "RISING"
                    : baseScore < previous - 0.03 ? "DECLINING" : "STABLE");
            ra.setTextScore(round2(textSignal.distressScore()));
            ra.setVoiceScore(voiceScore == null ? null : round2(voiceScore));
            ra.setBehaviorScore(round2(Math.min(1, freqDrop * 1.6)));
            ra.setBaselineDeviation(round2(clamp01(baseScore - 0.3)));
            ra.setTemporalScore(baseScore > previous + 0.05 ? 0.5 : 0.0);
            ra.setSignalAgreement(round2(clamp01(0.6 + (rnd.nextDouble() - 0.3) * 0.35)));
            ra.setConsistencyFlag(ra.getSignalAgreement() >= 0.75 ? "HIGH"
                    : ra.getSignalAgreement() >= 0.55 ? "MEDIUM" : "LOW");
            ra.setProvider("demo-seed");
            ra.setCreatedAt(at);
            riskRepo.save(ra);
            previous = baseScore;
        }
    }

    private void seedResources() {
        List<Resource> list = List.of(
                mkResource("24×7 Crisis Helpline", "CRISIS_SUPPORT",
                        "Immediate phone support for anyone in acute distress. Trained counselors available round the clock.",
                        "24/7", "English, Hindi + 8 regional", "Helpline 14416", "https://telemanas.mohfw.gov.in",
                        "isolation,anxiety,low_mood"),
                mkResource("Tele-MANAS National Counseling", "COUNSELING",
                        "Free tele-counseling by trained mental-health professionals through the national program.",
                        "24/7", "20+ languages", "14416", "https://telemanas.mohfw.gov.in",
                        "low_mood,anxiety,case_stress"),
                mkResource("Victim Compensation & Legal Aid Cell", "LEGAL_SUPPORT",
                        "Assistance with compensation claims, case documentation and court accompaniment.",
                        "Mon–Sat, 10:00–17:00", "English, Hindi", "legal-aid@demo.synora.ai", null,
                        "case_stress"),
                mkResource("Community Healing Circles", "COMMUNITY",
                        "Peer-facilitated group sessions for survivors and families in a safe, confidential setting.",
                        "Weekly, Saturdays", "Hindi, Marathi, Telugu", "community@demo.synora.ai", null,
                        "isolation,family"),
                mkResource("Sleep Restoration Program", "SELF_CARE",
                        "Structured 4-week program with guided audio for sleep difficulties and nightmares.",
                        "Self-paced", "English, Hindi", null, "https://demo.synora.ai/sleep-program",
                        "sleep"),
                mkResource("Grounding & Breathing Exercises", "SELF_CARE",
                        "Short guided practices for moments of acute anxiety or flashback.",
                        "Self-paced", "English, Hindi, Tamil", null, "https://demo.synora.ai/grounding",
                        "anxiety"),
                mkResource("Rehabilitation & Skill Training Center", "REHABILITATION",
                        "Vocational training and livelihood support for victims re-entering the workforce.",
                        "Mon–Fri, 09:00–16:00", "English, Hindi", "rehab@demo.synora.ai", null,
                        "work,case_stress"),
                mkResource("Understanding Trauma Responses", "ARTICLE",
                        "Counselor-reviewed article explaining common responses to distressing events and when to seek help.",
                        "Always available", "English", null, "https://demo.synora.ai/articles/trauma-responses",
                        "low_mood,anxiety"),
                mkResource("Family Support Workshops", "COMMUNITY",
                        "Monthly workshops helping families understand and support a loved one through recovery.",
                        "Monthly", "Hindi, English", "family@demo.synora.ai", null,
                        "family"));
        for (Resource r : list) {
            r.setReviewed(true);
            resourceRepo.save(r);
        }
    }

    /** Writes opening audit events for a case so its timeline has history. */
    private void seedAudit(Case c, User counselor) {
        Instant base = c.getCreatedAt() != null ? c.getCreatedAt() : Instant.now().minus(21, ChronoUnit.DAYS);
        com.synora.backend.audit.AuditLog created = new com.synora.backend.audit.AuditLog();
        created.setAction("CASE_CREATED");
        created.setResourceType("CASE");
        created.setActor("officer@demo.synora.ai");
        created.setDetails(c.getCaseNumber() + " opened for support monitoring");
        created.setCreatedAt(base);
        auditRepo.save(created);
        com.synora.backend.audit.AuditLog assigned = new com.synora.backend.audit.AuditLog();
        assigned.setAction("CASE_ASSIGNED");
        assigned.setResourceType("CASE");
        assigned.setActor("officer@demo.synora.ai");
        assigned.setDetails(c.getCaseNumber() + " → " + counselor.getEmail());
        assigned.setCreatedAt(base.plus(1, ChronoUnit.HOURS));
        auditRepo.save(assigned);
    }

    private Resource mkResource(String title, String category, String description, String availability,
                                String language, String contact, String link, String themes) {
        Resource r = new Resource();
        r.setTitle(title);
        r.setCategory(category);
        r.setDescription(description);
        r.setAvailability(availability);
        r.setLanguage(language);
        r.setContact(contact);
        r.setLink(link);
        r.setThemes(themes);
        return r;
    }

    private String levelFor(double s) {
        SynoraProperties.Risk t = props.risk();
        return s >= t.thresholdCritical() ? "CRITICAL" : s >= t.thresholdHigh() ? "HIGH"
                : s >= t.thresholdModerate() ? "MODERATE" : "LOW";
    }

    private static double clamp01(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
