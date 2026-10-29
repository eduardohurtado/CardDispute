package com.techmahindra.carddispute.transaction.service;

import java.time.Duration;
import java.util.Locale;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;

import lombok.RequiredArgsConstructor;

/**
 * Synthetic duplicate-charge rule evaluator for the two transactions selected by the customer.
 * Produces one of three outcomes:
 *
 * <ul>
 *   <li>{@code SUPPORTED}: same reference with identical merchant/amount/currency at any time
 *       distance (confirmed duplicate), or same amount/currency and normalized merchant within the
 *       duplicate window
 *   <li>{@code MANUAL_REVIEW}: plausible duplicate but high value (even with the same reference),
 *       contradictory reference data, ambiguous merchant or outside the strong window (still inside
 *       the review window)
 *   <li>{@code NOT_SUPPORTED}: no plausible duplicate
 * </ul>
 */
@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(DisputeRulesProperties.class)
public class DuplicateMatchingService {

    private final DisputeRulesProperties rules;

    public MatchAssessment evaluate(CardTransaction disputed, CardTransaction candidate) {
        if (candidate.getStatus() != TransactionStatus.POSTED) {
            return notSupported(
                    "The suspected duplicate is "
                            + candidate.getStatus()
                            + ", so it was not charged twice.");
        }

        MerchantMatch merchantMatch =
                compareMerchants(
                        disputed.getMerchantNormalized(), candidate.getMerchantNormalized());

        // The same processor reference on two different charges confirms the duplicate regardless
        // of
        // the time between them, as long as the rest of the charge data agrees. High-value amounts
        // still require an analyst.
        if (sameReference(disputed, candidate)) {
            String reference = disputed.getReference().trim();
            if (!sameMoney(disputed, candidate) || merchantMatch != MerchantMatch.EXACT) {
                return manualReview(
                        "Both charges share reference "
                                + reference
                                + " but merchant, amount or currency differ.");
            }
            if (isHighValue(disputed)) {
                return manualReview(
                        "Probable duplicate: both charges share reference "
                                + reference
                                + ", but the amount exceeds the high-value review threshold for "
                                + disputed.getCurrency()
                                + ".");
            }
            return new MatchAssessment(
                    AssessmentOutcome.SUPPORTED,
                    "Both charges share reference "
                            + reference
                            + " with the same merchant, amount and currency.");
        }

        if (!sameMoney(disputed, candidate)) {
            return notSupported(
                    "Amounts or currencies differ ("
                            + disputed.getAmount().stripTrailingZeros().toPlainString()
                            + " "
                            + disputed.getCurrency()
                            + " vs "
                            + candidate.getAmount().stripTrailingZeros().toPlainString()
                            + " "
                            + candidate.getCurrency()
                            + ").");
        }
        if (merchantMatch == MerchantMatch.NONE) {
            return notSupported("Merchants do not match.");
        }

        Duration distance =
                Duration.between(disputed.getOccurredAt(), candidate.getOccurredAt()).abs();
        if (distance.compareTo(rules.reviewMatchWindow()) > 0) {
            return notSupported(
                    "Charges are "
                            + describe(distance)
                            + " apart, outside the "
                            + describe(rules.reviewMatchWindow())
                            + " review window.");
        }

        if (isHighValue(disputed)) {
            return manualReview(
                    "Same charge repeated, but the amount exceeds the high-value "
                            + "review threshold for "
                            + disputed.getCurrency()
                            + ".");
        }
        if (merchantMatch == MerchantMatch.AMBIGUOUS) {
            return manualReview("Merchant descriptors are similar but not identical.");
        }
        if (distance.compareTo(rules.duplicateMatchWindow()) > 0) {
            return manualReview(
                    "Same merchant and amount, but charges are "
                            + describe(distance)
                            + " apart (strong match requires "
                            + describe(rules.duplicateMatchWindow())
                            + ").");
        }

        return new MatchAssessment(
                AssessmentOutcome.SUPPORTED,
                "Same merchant, amount and currency charged " + describe(distance) + " apart.");
    }

    private static boolean sameReference(CardTransaction a, CardTransaction b) {
        return a.getReference() != null
                && !a.getReference().isBlank()
                && b.getReference() != null
                && a.getReference().trim().equalsIgnoreCase(b.getReference().trim());
    }

    private static boolean sameMoney(CardTransaction a, CardTransaction b) {
        return a.getCurrency().equals(b.getCurrency())
                && a.getAmount().compareTo(b.getAmount()) == 0;
    }

    private boolean isHighValue(CardTransaction transaction) {
        return rules.highValueThreshold(transaction.getCurrency())
                .map(threshold -> transaction.getAmount().compareTo(threshold) > 0)
                .orElse(false);
    }

    enum MerchantMatch {
        EXACT,
        AMBIGUOUS,
        NONE
    }

    static MerchantMatch compareMerchants(String a, String b) {
        String left = normalize(a);
        String right = normalize(b);
        if (left.equals(right)) {
            return MerchantMatch.EXACT;
        }
        String compactLeft = left.replaceAll("[^A-Z0-9]", "");
        String compactRight = right.replaceAll("[^A-Z0-9]", "");
        if (!compactLeft.isEmpty()
                && !compactRight.isEmpty()
                && (compactLeft.startsWith(compactRight) || compactRight.startsWith(compactLeft))) {
            return MerchantMatch.AMBIGUOUS;
        }
        return MerchantMatch.NONE;
    }

    private static String normalize(String merchant) {
        return merchant == null
                ? ""
                : merchant.trim().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private static MatchAssessment notSupported(String explanation) {
        return new MatchAssessment(AssessmentOutcome.NOT_SUPPORTED, explanation);
    }

    private static MatchAssessment manualReview(String explanation) {
        return new MatchAssessment(AssessmentOutcome.MANUAL_REVIEW, explanation);
    }

    private static String describe(Duration duration) {
        if (duration.toDays() >= 1) {
            return duration.toDays() + " day(s)";
        }
        if (duration.toHours() >= 1) {
            long minutes = duration.toMinutesPart();
            return duration.toHours() + " h" + (minutes > 0 ? " " + minutes + " min" : "");
        }
        return duration.toMinutes() + " min";
    }
}
