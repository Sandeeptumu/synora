package com.synora.backend.ai;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Deterministic lexicon-based text distress analyzer.
 * Same input always produces the same output (required for demo reproducibility).
 */
@Component
public class DeterministicTextAnalyzer {

    private static final Set<String> NEGATIVE = Set.of(
            "sad", "hopeless", "numb", "empty", "worthless", "broken", "tired", "exhausted",
            "afraid", "scared", "anxious", "panic", "angry", "guilty", "ashamed", "alone",
            "lonely", "helpless", "trapped", "hurt", "pain", "suffering", "crying", "cried",
            "tears", "nightmare", "nightmares", "insomnia", "cannot", "cant", "can't", "unable");

    private static final Set<String> SLEEP = Set.of(
            "sleep", "sleeping", "insomnia", "nightmare", "nightmares", "awake", "restless",
            "tossing", "cant sleep", "can't sleep", "not sleeping");

    private static final Set<String> URGENT = Set.of(
            "cant take", "can't take", "end it", "no point", "give up", "kill", "die", "suicide",
            "suicidal", "self harm", "self-harm", "hurt myself", "harm myself", "overdose");

    private static final Set<String> POSITIVE = Set.of(
            "better", "calm", "hopeful", "okay", "ok", "fine", "good", "improving", "stable",
            "peaceful", "slept", "sleeping better", "grateful", "supported", "strong");

    private static final Set<String> THEME_MAP = Set.of(); // placeholder to keep structure clear

    public TextResult analyze(String raw) {
        String text = raw == null ? "" : raw.toLowerCase(Locale.ROOT);
        if (text.isBlank()) {
            return new TextResult(0.05, "neutral", List.of(), List.of(), false, false, null, 0.5);
        }

        List<String> foundNegative = new ArrayList<>();
        List<String> foundPositive = new ArrayList<>();
        List<String> themes = new ArrayList<>();
        int negativeCount = 0;
        int positiveCount = 0;

        for (String w : NEGATIVE) {
            if (containsWord(text, w)) {
                negativeCount++;
                foundNegative.add(w);
            }
        }
        for (String w : POSITIVE) {
            if (containsWord(text, w)) {
                positiveCount++;
                foundPositive.add(w);
            }
        }

        // Themes
        if (containsAny(text, "sleep", "insomnia", "nightmare", "restless", "awake")) themes.add("sleep");
        if (containsAny(text, "afraid", "scared", "anxious", "panic", "worry", "nervous")) themes.add("anxiety");
        if (containsAny(text, "sad", "cry", "crying", "tears", "hopeless", "empty", "numb")) themes.add("low_mood");
        if (containsAny(text, "angry", "furious", "rage", "irritated", "frustrated")) themes.add("anger");
        if (containsAny(text, "alone", "lonely", "nobody", "isolated", "no one")) themes.add("isolation");
        if (containsAny(text, "court", "case", "hearing", "police", "statement", "lawyer")) themes.add("case_stress");
        if (containsAny(text, "work", "job", "office", "boss", "salary")) themes.add("work");
        if (containsAny(text, "family", "children", "kids", "parents", "home")) themes.add("family");
        if (containsAny(text, "health", "body", "pain", "sick", "medicine", "doctor")) themes.add("health");
        if (containsAny(text, "hope", "better", "improving", "grateful", "thankful", "supported")) themes.add("hope");

        boolean sleepDisruption = containsAny(text, SLEEP.toArray(new String[0]));
        boolean urgency = containsAny(text, URGENT.toArray(new String[0]));

        // Score composition: density of negative words, boosted by urgency, reduced by positive words.
        int words = Math.max(8, text.split("\\W+").length);
        double density = (double) negativeCount / words;
        double score = 0.18 + density * 6.5;
        if (themes.contains("isolation")) score += 0.08;
        if (themes.contains("case_stress")) score += 0.05;
        if (sleepDisruption) score += 0.10;
        if (positiveCount > 0) score -= 0.06 * Math.min(3, positiveCount);
        if (urgency) score += 0.35;
        score = AIProvider.clamp01(score);

        String sentiment = urgency ? "negative"
                : score > 0.55 ? "negative"
                : score > 0.30 ? "mixed"
                : positiveCount > negativeCount ? "positive" : "neutral";

        String urgencyNote = urgency
                ? "Text contains urgent/critical phrasing requiring immediate human review"
                : null;

        double confidence = AIProvider.clamp01(0.45 + 0.05 * Math.min(10, words / 4));
        return new TextResult(score, sentiment, themes, foundNegative, sleepDisruption, urgency, urgencyNote, confidence);
    }

    private boolean containsWord(String text, String word) {
        // handles multi-word phrases too
        if (word.contains(" ")) return text.contains(word);
        return java.util.regex.Pattern.compile("\\b" + java.util.regex.Pattern.quote(word) + "\\b")
                .matcher(text).find();
    }

    private boolean containsAny(String text, String... needles) {
        for (String n : needles) {
            if (text.contains(n)) return true;
        }
        return false;
    }

    public record TextResult(double distressScore, String sentiment, List<String> themes,
                             List<String> negativeTerms, boolean sleepDisruption, boolean urgency,
                             String urgencyNote, double confidence) {}
}
