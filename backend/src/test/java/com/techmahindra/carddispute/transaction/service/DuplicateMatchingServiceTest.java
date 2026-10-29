package com.techmahindra.carddispute.transaction.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;

class DuplicateMatchingServiceTest {

    private static final UUID CUSTOMER = UUID.randomUUID();
    private static final Instant T0 = Instant.parse("2026-10-15T09:00:00Z");

    private final DuplicateMatchingService service =
            new DuplicateMatchingService(
                    new DisputeRulesProperties(
                            Duration.ofDays(60),
                            Duration.ofHours(1),
                            Duration.ofHours(24),
                            Map.of(
                                    "COP",
                                    new BigDecimal("2000000"),
                                    "USD",
                                    new BigDecimal("500"))));

    @Test
    void sameMerchantAmountAndCloseInTimeIsSupported() {
        var result =
                service.evaluate(
                        tx("CAFE AROMA", "35000", "COP", T0),
                        tx("CAFE AROMA", "35000.0000", "COP", T0.plus(Duration.ofMinutes(10))));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.SUPPORTED);
        assertThat(result.explanation()).contains("10 min");
    }

    @Test
    void differentAmountIsNotSupported() {
        var result =
                service.evaluate(
                        tx("BOOK STORE", "80000", "COP", T0),
                        tx("BOOK STORE", "95000", "COP", T0.plusSeconds(600)));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.NOT_SUPPORTED);
    }

    @Test
    void differentCurrencyIsNotSupported() {
        var result = service.evaluate(tx("SHOP", "10", "USD", T0), tx("SHOP", "10", "COP", T0));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.NOT_SUPPORTED);
    }

    @Test
    void ambiguousMerchantGoesToManualReview() {
        var result =
                service.evaluate(
                        tx("FUEL STOP", "120000", "COP", T0),
                        tx("FUEL STOP NORTE", "120000", "COP", T0.plusSeconds(1200)));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.MANUAL_REVIEW);
    }

    @Test
    void unrelatedMerchantIsNotSupported() {
        var result =
                service.evaluate(
                        tx("PIZZA PALACE", "42000", "COP", T0),
                        tx("BOOK STORE", "42000", "COP", T0.plusSeconds(60)));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.NOT_SUPPORTED);
    }

    @Test
    void highValueGoesToManualReviewEvenWhenExact() {
        var result =
                service.evaluate(
                        tx("ELECTRO HOGAR", "3500000", "COP", T0),
                        tx("ELECTRO HOGAR", "3500000", "COP", T0.plusSeconds(300)));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.MANUAL_REVIEW);
        assertThat(result.explanation()).contains("high-value");
    }

    @Test
    void outsideStrongWindowButInsideReviewWindowGoesToManualReview() {
        var result =
                service.evaluate(
                        tx("STREAMING PLUS", "15.99", "USD", T0),
                        tx("STREAMING PLUS", "15.99", "USD", T0.plus(Duration.ofHours(3))));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.MANUAL_REVIEW);
    }

    @Test
    void exactlyOneHourApartIsStillSupported() {
        var result =
                service.evaluate(
                        tx("CAFE", "1", "USD", T0),
                        tx("CAFE", "1", "USD", T0.plus(Duration.ofHours(1))));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.SUPPORTED);
    }

    @Test
    void outsideReviewWindowIsNotSupported() {
        var result =
                service.evaluate(
                        tx("CAFE", "1", "USD", T0),
                        tx("CAFE", "1", "USD", T0.plus(Duration.ofDays(3))));

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.NOT_SUPPORTED);
    }

    @Test
    void reversedCandidateIsNotSupported() {
        var candidate =
                builder("CAFE", "1", "USD", T0.plusSeconds(60))
                        .status(TransactionStatus.REVERSED)
                        .build();

        var result = service.evaluate(tx("CAFE", "1", "USD", T0), candidate);

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.NOT_SUPPORTED);
    }

    @Test
    void sameReferenceWithEqualValuesIsConfirmedDuplicate() {
        var disputed =
                builder("MERCADO CENTRAL", "87500", "COP", T0).reference("SYN-REF-0013").build();
        var candidate =
                builder("MERCADO CENTRAL", "87500.0000", "COP", T0)
                        .reference("syn-ref-0013 ")
                        .build();

        var result = service.evaluate(disputed, candidate);

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.SUPPORTED);
        assertThat(result.explanation()).contains("SYN-REF-0013");
    }

    @Test
    void sameReferenceConfirmsDuplicateRegardlessOfTime() {
        var disputed =
                builder("MERCADO CENTRAL", "87500", "COP", T0).reference("SYN-REF-0013").build();
        var candidate =
                builder("MERCADO CENTRAL", "87500", "COP", T0.plus(Duration.ofDays(3)))
                        .reference("SYN-REF-0013")
                        .build();

        var result = service.evaluate(disputed, candidate);

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.SUPPORTED);
    }

    @Test
    void sameReferenceWithHighValueStillGoesToManualReview() {
        var disputed =
                builder("TECNO MUNDO", "4800000", "COP", T0).reference("SYN-REF-0015").build();
        var candidate =
                builder("TECNO MUNDO", "4800000", "COP", T0).reference("SYN-REF-0015").build();

        var result = service.evaluate(disputed, candidate);

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.MANUAL_REVIEW);
        assertThat(result.explanation())
                .contains("Probable duplicate", "SYN-REF-0015", "high-value");
    }

    @Test
    void sameReferenceWithDifferentAmountGoesToManualReview() {
        var disputed = builder("HOTEL ANDES", "320", "USD", T0).reference("SYN-REF-0017").build();
        var candidate = builder("HOTEL ANDES", "230", "USD", T0).reference("SYN-REF-0017").build();

        var result = service.evaluate(disputed, candidate);

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.MANUAL_REVIEW);
    }

    @Test
    void sameReferenceOnReversedCandidateIsNotSupported() {
        var disputed = builder("CAFE", "1", "USD", T0).reference("SYN-1").build();
        var candidate =
                builder("CAFE", "1", "USD", T0)
                        .reference("SYN-1")
                        .status(TransactionStatus.REVERSED)
                        .build();

        var result = service.evaluate(disputed, candidate);

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.NOT_SUPPORTED);
    }

    @Test
    void missingReferencesFallBackToMatchingRules() {
        var disputed = builder("ELECTRO HOGAR", "3500000", "COP", T0).reference(null).build();
        var candidate = builder("ELECTRO HOGAR", "3500000", "COP", T0).reference(null).build();

        var result = service.evaluate(disputed, candidate);

        assertThat(result.outcome()).isEqualTo(AssessmentOutcome.MANUAL_REVIEW);
    }

    @Test
    void merchantComparison() {
        assertThat(DuplicateMatchingService.compareMerchants("cafe  aroma", "CAFE AROMA"))
                .isEqualTo(DuplicateMatchingService.MerchantMatch.EXACT);
        assertThat(DuplicateMatchingService.compareMerchants("FUELSTOP", "FUEL STOP NORTE"))
                .isEqualTo(DuplicateMatchingService.MerchantMatch.AMBIGUOUS);
        assertThat(DuplicateMatchingService.compareMerchants("FUEL STOP", "BOOK STORE"))
                .isEqualTo(DuplicateMatchingService.MerchantMatch.NONE);
    }

    private static CardTransaction tx(
            String merchant, String amount, String currency, Instant occurredAt) {
        return builder(merchant, amount, currency, occurredAt).build();
    }

    /** Each transaction gets its own reference unless the test overrides it. */
    private static CardTransaction.CardTransactionBuilder builder(
            String merchant, String amount, String currency, Instant occurredAt) {
        return CardTransaction.builder()
                .transactionId(UUID.randomUUID())
                .customerId(CUSTOMER)
                .cardLast4("4821")
                .merchantName(merchant)
                .merchantNormalized(merchant)
                .reference("SYN-" + UUID.randomUUID())
                .amount(new BigDecimal(amount))
                .currency(currency)
                .occurredAt(occurredAt)
                .postedAt(occurredAt.plus(Duration.ofHours(20)))
                .status(TransactionStatus.POSTED);
    }
}
