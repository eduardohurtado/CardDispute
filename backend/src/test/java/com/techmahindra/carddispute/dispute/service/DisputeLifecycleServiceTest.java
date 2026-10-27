package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.common.exception.BusinessRuleViolationException;
import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.dispute.entity.AuditEventType;
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
import org.mockito.InOrder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class DisputeLifecycleServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-21T10:00:00Z");

    private DisputeCaseRepository disputeRepository;
    private DisputeDecisionRepository decisionRepository;
    private DisputeAuditService auditService;
    private TransactionService transactionService;
    private DuplicateMatchingService matchingService;
    private DisputeLifecycleService service;
    private DisputeCase dispute;

    @BeforeEach
    void setUp() {
        disputeRepository = mock(DisputeCaseRepository.class);
        decisionRepository = mock(DisputeDecisionRepository.class);
        auditService = mock(DisputeAuditService.class);
        transactionService = mock(TransactionService.class);
        matchingService = mock(DuplicateMatchingService.class);
        service = new DisputeLifecycleService(disputeRepository, decisionRepository, auditService,
                transactionService, matchingService, Clock.fixed(NOW, ZoneOffset.UTC));

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

        InOrder audit = inOrder(auditService);
        audit.verify(auditService).record(eq(dispute.getDisputeId()), eq(AuditEventType.STATE_CHANGED),
                eq(DisputeStatus.SUBMITTED), eq(DisputeStatus.IN_REVIEW), eq("SYSTEM"), eq("c"), isNull(), eq(NOW));
        audit.verify(auditService).record(eq(dispute.getDisputeId()), eq(AuditEventType.ASSESSED),
                eq(DisputeStatus.IN_REVIEW), eq(DisputeStatus.IN_REVIEW), eq("SYSTEM"), eq("c"),
                eq("SUPPORTED: Same merchant 10 min apart."), eq(NOW));
        audit.verify(auditService).record(eq(dispute.getDisputeId()), eq(AuditEventType.DECIDED),
                eq(DisputeStatus.IN_REVIEW), eq(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED), eq("SYSTEM"), eq("c"),
                startsWith("DUPLICATE_SUPPORTED: Automated assessment"), eq(NOW));
        verifyNoMoreInteractions(auditService);
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
        verifyNoInteractions(auditService);
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
        verify(auditService).record(eq(dispute.getDisputeId()), eq(AuditEventType.STATE_CHANGED),
                eq(DisputeStatus.IN_REVIEW), eq(DisputeStatus.AWAITING_ANALYST), eq("SYSTEM"), eq("c"), isNull(),
                eq(NOW));
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
        // A retried step must not duplicate the audit entry
        verify(auditService, times(1)).record(any(), eq(AuditEventType.STATE_CHANGED), any(), any(), any(), any(),
                any(), any());
    }

    @Test
    void analystResolvesAwaitingDispute() {
        awaitingAnalyst();

        service.resolveByAnalyst(dispute.getDisputeId(), DecisionType.DUPLICATE_SUPPORTED,
                "  Same receipt on both charges  ", "analyst001", "c");

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED);
        assertThat(dispute.getResolvedAt()).isEqualTo(NOW);
        ArgumentCaptor<DisputeDecision> decision = ArgumentCaptor.forClass(DisputeDecision.class);
        verify(decisionRepository).save(decision.capture());
        assertThat(decision.getValue().getDecisionType()).isEqualTo(DecisionType.DUPLICATE_SUPPORTED);
        assertThat(decision.getValue().getDecisionSource()).isEqualTo(DecisionSource.ANALYST);
        assertThat(decision.getValue().getRationale()).isEqualTo("Same receipt on both charges");
        assertThat(decision.getValue().getDecidedBy()).isEqualTo("analyst001");
        verify(auditService).record(eq(dispute.getDisputeId()), eq(AuditEventType.DECIDED),
                eq(DisputeStatus.AWAITING_ANALYST), eq(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED),
                eq("analyst001"), eq("c"), eq("DUPLICATE_SUPPORTED: Same receipt on both charges"), eq(NOW));
    }

    @Test
    void analystCanStillDecideAfterReviewTimeout() {
        awaitingAnalyst();
        service.markReviewTimedOut(dispute.getDisputeId(), "c");

        service.resolveByAnalyst(dispute.getDisputeId(), DecisionType.NOT_SUPPORTED, "Different purchases",
                "analyst001", "c");

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.RESOLVED_NOT_SUPPORTED);
    }

    @Test
    void analystCanDecideDisputeLeftInReviewByPreviousProcessVersion() {
        dispute.transitionTo(DisputeStatus.IN_REVIEW, NOW);
        dispute.recordAssessment(AssessmentOutcome.MANUAL_REVIEW, NOW);

        service.resolveByAnalyst(dispute.getDisputeId(), DecisionType.NOT_SUPPORTED, "Different purchases",
                "analyst001", "c");

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.RESOLVED_NOT_SUPPORTED);
    }

    @Test
    void analystDecisionRequiresRationale() {
        awaitingAnalyst();

        assertThatThrownBy(() -> service.validateAnalystDecision(dispute.getDisputeId(),
                DecisionType.NOT_SUPPORTED, "   ", "analyst001"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasFieldOrPropertyWithValue("errorCode", "RATIONALE_REQUIRED");
        assertThatThrownBy(() -> service.resolveByAnalyst(dispute.getDisputeId(),
                DecisionType.NOT_SUPPORTED, null, "analyst001", "c"))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(decisionRepository, never()).save(any());
    }

    @Test
    void analystDecisionRejectsTooLongRationale() {
        awaitingAnalyst();

        assertThatThrownBy(() -> service.validateAnalystDecision(dispute.getDisputeId(),
                DecisionType.NOT_SUPPORTED, "x".repeat(1001), "analyst001"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasFieldOrPropertyWithValue("errorCode", "RATIONALE_TOO_LONG");
    }

    @Test
    void analystCannotDecideResolvedDispute() {
        dispute.transitionTo(DisputeStatus.IN_REVIEW, NOW);
        dispute.recordAssessment(AssessmentOutcome.SUPPORTED, NOW);
        dispute.transitionTo(DisputeStatus.RESOLVED_DUPLICATE_SUPPORTED, NOW);

        assertThatThrownBy(() -> service.validateAnalystDecision(dispute.getDisputeId(),
                DecisionType.NOT_SUPPORTED, "Override", "analyst001"))
                .isInstanceOf(ConflictException.class)
                .hasFieldOrPropertyWithValue("errorCode", "DISPUTE_ALREADY_RESOLVED");
    }

    @Test
    void analystCannotDecideAutomaticallyAssessedDispute() {
        dispute.transitionTo(DisputeStatus.IN_REVIEW, NOW);
        dispute.recordAssessment(AssessmentOutcome.SUPPORTED, NOW);

        assertThatThrownBy(() -> service.resolveByAnalyst(dispute.getDisputeId(),
                DecisionType.NOT_SUPPORTED, "Override", "analyst001", "c"))
                .isInstanceOf(ConflictException.class)
                .hasFieldOrPropertyWithValue("errorCode", "MANUAL_REVIEW_NOT_REQUIRED");
        verify(decisionRepository, never()).save(any());
    }

    @Test
    void retriedAnalystResolutionIsNoOp() {
        awaitingAnalyst();
        dispute.transitionTo(DisputeStatus.RESOLVED_NOT_SUPPORTED, NOW);
        when(decisionRepository.findByDisputeId(dispute.getDisputeId())).thenReturn(Optional.of(
                DisputeDecision.of(dispute.getDisputeId(), DecisionType.NOT_SUPPORTED, DecisionSource.ANALYST,
                        "Different purchases", "analyst001", NOW)));

        service.resolveByAnalyst(dispute.getDisputeId(), DecisionType.NOT_SUPPORTED, "Different purchases",
                "analyst001", "c");

        verify(decisionRepository, never()).save(any());
        verifyNoInteractions(auditService);
    }

    @Test
    void validationDoesNotChangeTheDispute() {
        awaitingAnalyst();

        service.validateAnalystDecision(dispute.getDisputeId(), DecisionType.NOT_SUPPORTED, "Different purchases",
                "analyst001");

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.AWAITING_ANALYST);
        verify(decisionRepository, never()).save(any());
        verifyNoInteractions(auditService);
    }

    @Test
    void reviewDeadlineFlagsAwaitingDispute() {
        awaitingAnalyst();

        service.markReviewTimedOut(dispute.getDisputeId(), "c");

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.TIMEOUT_REVIEW_REQUIRED);
        assertThat(dispute.getStatus().isOpen()).isTrue();
        verify(auditService).record(eq(dispute.getDisputeId()), eq(AuditEventType.STATE_CHANGED),
                eq(DisputeStatus.AWAITING_ANALYST), eq(DisputeStatus.TIMEOUT_REVIEW_REQUIRED), eq("SYSTEM"),
                eq("c"), eq("Analyst review deadline reached"), eq(NOW));
    }

    @Test
    void reviewDeadlineIsIgnoredOnceDecided() {
        awaitingAnalyst();
        dispute.transitionTo(DisputeStatus.RESOLVED_NOT_SUPPORTED, NOW);

        service.markReviewTimedOut(dispute.getDisputeId(), "c");

        assertThat(dispute.getStatus()).isEqualTo(DisputeStatus.RESOLVED_NOT_SUPPORTED);
        verifyNoInteractions(auditService);
    }

    /** Puts the test dispute in AWAITING_ANALYST with a MANUAL_REVIEW assessment, without audit calls. */
    private void awaitingAnalyst() {
        dispute.transitionTo(DisputeStatus.IN_REVIEW, NOW);
        dispute.recordAssessment(AssessmentOutcome.MANUAL_REVIEW, NOW);
        dispute.transitionTo(DisputeStatus.AWAITING_ANALYST, NOW);
    }
}
