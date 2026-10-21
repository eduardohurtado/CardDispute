package com.techmahindra.carddispute.dispute.entity;

import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.transaction.service.AssessmentOutcome;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DisputeCaseTest {

    private static final Instant NOW = Instant.parse("2026-10-21T10:00:00Z");

    @Test
    void followsAutomaticResolutionPath() {
        DisputeCase dispute = newDispute();

        dispute.transitionTo(DisputeStatus.IN_REVIEW, NOW);
        dispute.transitionTo(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED, NOW.plusSeconds(1));

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED);
        assertThat(dispute.getResolvedAt()).isEqualTo(NOW.plusSeconds(1));
    }

    @Test
    void cannotSkipReview() {
        DisputeCase dispute = newDispute();

        assertThatThrownBy(() -> dispute.transitionTo(DisputeStatus.RESOLVED_NOT_SUPPORTED, NOW))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void terminalStatesAreImmutable() {
        DisputeCase dispute = newDispute();
        dispute.transitionTo(DisputeStatus.IN_REVIEW, NOW);
        dispute.transitionTo(DisputeStatus.RESOLVED_NOT_SUPPORTED, NOW);

        for (DisputeStatus target : DisputeStatus.values()) {
            assertThat(DisputeStatus.RESOLVED_NOT_SUPPORTED.canTransitionTo(target)).isFalse();
        }
        assertThatThrownBy(() -> dispute.transitionTo(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED, NOW))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void timeoutIsNotTerminal() {
        assertThat(DisputeStatus.TIMEOUT_REVIEW_REQUIRED.isOpen()).isTrue();
        assertThat(DisputeStatus.TIMEOUT_REVIEW_REQUIRED.canTransitionTo(DisputeStatus.RESOLVED_NOT_SUPPORTED)).isTrue();
    }

    @Test
    void recordsAssessmentOutcome() {
        DisputeCase dispute = newDispute();

        dispute.recordAssessment(AssessmentOutcome.SUPPORTED, NOW.plusSeconds(5));

        assertThat(dispute.getAssessmentOutcome()).isEqualTo(AssessmentOutcome.SUPPORTED);
        assertThat(dispute.getUpdatedAt()).isEqualTo(NOW.plusSeconds(5));
    }

    private static DisputeCase newDispute() {
        return DisputeCase.submit(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                ReasonCode.POSSIBLE_DUPLICATE, null, NOW);
    }
}
