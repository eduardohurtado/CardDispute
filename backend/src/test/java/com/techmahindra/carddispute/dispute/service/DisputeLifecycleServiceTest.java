package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.dispute.entity.DecisionSource;
import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.entity.DisputeCase;
import com.techmahindra.carddispute.dispute.entity.DisputeDecision;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.entity.ReasonCode;
import com.techmahindra.carddispute.dispute.repository.DisputeCaseRepository;
import com.techmahindra.carddispute.dispute.repository.DisputeDecisionRepository;
import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.service.AssessmentOutcome;
import com.techmahindra.carddispute.transaction.service.DuplicateMatchingService;
import com.techmahindra.carddispute.transaction.service.MatchAssessment;
import com.techmahindra.carddispute.transaction.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DisputeLifecycleServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-21T10:00:00Z");

    private DisputeCaseRepository disputeRepository;
    private DisputeDecisionRepository decisionRepository;
    private TransactionService transactionService;
    private DuplicateMatchingService matchingService;
    private DisputeLifecycleService service;
    private DisputeCase dispute;

    @BeforeEach
    void setUp() {
        disputeRepository = mock(DisputeCaseRepository.class);
        decisionRepository = mock(DisputeDecisionRepository.class);
        transactionService = mock(TransactionService.class);
        matchingService = mock(DuplicateMatchingService.class);
        service = new DisputeLifecycleService(disputeRepository, decisionRepository, transactionService,
                matchingService, Clock.fixed(NOW, ZoneOffset.UTC));

        dispute = DisputeCase.submit(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                ReasonCode.POSSIBLE_DUPLICATE, null, NOW);
        when(disputeRepository.findById(dispute.getDisputeId())).thenReturn(Optional.of(dispute));
        when(decisionRepository.findByDisputeId(any())).thenReturn(Optional.empty());
    }

    @Test
    void automaticPathResolvesWithAutomatedDecision() {
        CardTransaction transaction = mock(CardTransaction.class);
        CardTransaction candidate = mock(CardTransaction.class);
        when(transactionService.getById(dispute.getTransactionId())).thenReturn(transaction);
        when(transactionService.getById(dispute.getCandidateTransactionId())).thenReturn(candidate);
        when(matchingService.evaluate(transaction, candidate)).thenReturn(
                new MatchAssessment(AssessmentOutcome.SUPPORTED, "Same merchant 10 min apart."));

        service.markInReview(dispute.getDisputeId(), "c");
        AssessmentOutcome outcome = service.assess(dispute.getDisputeId(), "c");
        service.resolveAutomatically(dispute.getDisputeId(), "c");

        assertThat(outcome).isEqualTo(AssessmentOutcome.SUPPORTED);
        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED);
        assertThat(dispute.getResolvedAt()).isEqualTo(NOW);

        ArgumentCaptor<DisputeDecision> decision = ArgumentCaptor.forClass(DisputeDecision.class);
        verify(decisionRepository).save(decision.capture());
        assertThat(decision.getValue().getDecisionType()).isEqualTo(DecisionType.DUPLICATE_SUPPORTED);
        assertThat(decision.getValue().getDecisionSource()).isEqualTo(DecisionSource.AUTOMATED);
        assertThat(decision.getValue().getRationale()).isEqualTo("Automated assessment: Same merchant 10 min apart.");
        assertThat(decision.getValue().getDecidedBy()).isEqualTo("SYSTEM");
    }

    @Test
    void resolveFailsWhenReEvaluationNoLongerMatches() {
        CardTransaction transaction = mock(CardTransaction.class);
        CardTransaction candidate = mock(CardTransaction.class);
        when(transactionService.getById(dispute.getTransactionId())).thenReturn(transaction);
        when(transactionService.getById(dispute.getCandidateTransactionId())).thenReturn(candidate);
        when(matchingService.evaluate(transaction, candidate)).thenReturn(
                new MatchAssessment(AssessmentOutcome.NOT_SUPPORTED, "Amounts differ."));
        dispute.transitionTo(DisputeStatus.IN_REVIEW, NOW);
        dispute.recordAssessment(AssessmentOutcome.SUPPORTED, NOW);

        assertThatThrownBy(() -> service.resolveAutomatically(dispute.getDisputeId(), "c"))
                .isInstanceOf(ConflictException.class)
                .hasFieldOrPropertyWithValue("errorCode", "ASSESSMENT_CHANGED");
        verify(decisionRepository, never()).save(any());
    }

    @Test
    void manualReviewCannotBeResolvedAutomatically() {
        dispute.transitionTo(DisputeStatus.IN_REVIEW, NOW);
        dispute.recordAssessment(AssessmentOutcome.MANUAL_REVIEW, NOW);

        assertThatThrownBy(() -> service.resolveAutomatically(dispute.getDisputeId(), "c"))
                .isInstanceOf(ConflictException.class)
                .hasFieldOrPropertyWithValue("errorCode", "MANUAL_REVIEW_REQUIRED");
        verify(decisionRepository, never()).save(any());

        service.markAwaitingAnalyst(dispute.getDisputeId(), "c");
        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.AWAITING_ANALYST);
    }

    @Test
    void assessRequiresInReview() {
        assertThatThrownBy(() -> service.assess(dispute.getDisputeId(), "c"))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void markInReviewIsIdempotent() {
        service.markInReview(dispute.getDisputeId(), "c");
        service.markInReview(dispute.getDisputeId(), "c");

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.IN_REVIEW);
    }
}
