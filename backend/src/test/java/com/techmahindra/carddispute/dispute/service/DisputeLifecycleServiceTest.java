package com.techmahindra.carddispute.dispute.service;

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
}
