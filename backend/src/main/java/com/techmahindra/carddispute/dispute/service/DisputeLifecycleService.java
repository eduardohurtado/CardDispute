package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.dispute.entity.DecisionSource;
import com.techmahindra.carddispute.dispute.entity.DecisionType;
import com.techmahindra.carddispute.dispute.entity.DisputeCase;
import com.techmahindra.carddispute.dispute.entity.DisputeDecision;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.repository.DisputeCaseRepository;
import com.techmahindra.carddispute.dispute.repository.DisputeDecisionRepository;
import com.techmahindra.carddispute.transaction.service.AssessmentOutcome;
import com.techmahindra.carddispute.transaction.service.DuplicateMatchingService;
import com.techmahindra.carddispute.transaction.service.MatchAssessment;
import com.techmahindra.carddispute.transaction.service.TransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * Business steps executed by the workflow (thin Camunda delegates call these methods).
 * Each step validates the current business status, so a step is a no-op when it already happened
 * (e.g. a retried service task) and fails with 409/incident when the case is in an unexpected state.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DisputeLifecycleService {

    public static final String SYSTEM_ACTOR = "SYSTEM";

    private final DisputeCaseRepository disputeRepository;
    private final DisputeDecisionRepository decisionRepository;
    private final TransactionService transactionService;
    private final DuplicateMatchingService matchingService;
    private final Clock clock;

    /** SUBMITTED -> IN_REVIEW. */
    @Transactional
    public void markInReview(UUID disputeId, String correlationId) {
        DisputeCase dispute = load(disputeId);
        if (dispute.getStatus() == DisputeStatus.IN_REVIEW) {
            return;
        }
        changeStatus(dispute, DisputeStatus.IN_REVIEW, correlationId);
    }

    /** Runs the synthetic matching rules and stores the outcome used by the BPMN gateway. */
    @Transactional
    public AssessmentOutcome assess(UUID disputeId, String correlationId) {
        DisputeCase dispute = load(disputeId);
        requireStatus(dispute, DisputeStatus.IN_REVIEW);

        MatchAssessment assessment = evaluate(dispute);
        dispute.recordAssessment(assessment.outcome(), clock.instant());

        log.info("Dispute {} assessed as {}: {} (correlationId={})", disputeId, assessment.outcome(),
                assessment.explanation(), correlationId);
        return assessment.outcome();
    }

    /** IN_REVIEW -> RESOLVED_* for SUPPORTED / NOT_SUPPORTED outcomes, with an AUTOMATED decision. */
    @Transactional
    public void resolveAutomatically(UUID disputeId, String correlationId) {
        DisputeCase dispute = load(disputeId);
        if (dispute.getStatus().isTerminal() && decisionRepository.findByDisputeId(disputeId).isPresent()) {
            return;
        }
        requireStatus(dispute, DisputeStatus.IN_REVIEW);

        DecisionType decisionType = switch (requireOutcome(dispute)) {
            case SUPPORTED -> DecisionType.DUPLICATE_SUPPORTED;
            case NOT_SUPPORTED -> DecisionType.NOT_SUPPORTED;
            case MANUAL_REVIEW -> throw new ConflictException("MANUAL_REVIEW_REQUIRED",
                    "Dispute " + disputeId + " requires an analyst decision");
        };

        // The rules are deterministic over the synthetic data: re-evaluate to build the rationale
        MatchAssessment assessment = evaluate(dispute);
        if (assessment.outcome() != dispute.getAssessmentOutcome()) {
            throw new ConflictException("ASSESSMENT_CHANGED",
                    "Dispute " + disputeId + " no longer matches its recorded assessment");
        }
        String rationale = "Automated assessment: " + assessment.explanation();

        Instant now = clock.instant();
        dispute.transitionTo(decisionType.resultingStatus(), now);
        decisionRepository.save(DisputeDecision.of(disputeId, decisionType, DecisionSource.AUTOMATED, rationale,
                SYSTEM_ACTOR, now));
        // Increment 3: save the notification outbox event here, in this same transaction

        log.info("Dispute {} resolved automatically as {} (correlationId={})", disputeId, decisionType, correlationId);
    }

    /** IN_REVIEW -> AWAITING_ANALYST for MANUAL_REVIEW outcomes. */
    @Transactional
    public void markAwaitingAnalyst(UUID disputeId, String correlationId) {
        DisputeCase dispute = load(disputeId);
        if (dispute.getStatus() == DisputeStatus.AWAITING_ANALYST) {
            return;
        }
        if (requireOutcome(dispute) != AssessmentOutcome.MANUAL_REVIEW) {
            throw new ConflictException("INVALID_STATE_TRANSITION",
                    "Dispute " + disputeId + " was not assessed for manual review");
        }
        changeStatus(dispute, DisputeStatus.AWAITING_ANALYST, correlationId);
    }

    private MatchAssessment evaluate(DisputeCase dispute) {
        return matchingService.evaluate(transactionService.getById(dispute.getTransactionId()),
                transactionService.getById(dispute.getCandidateTransactionId()));
    }

    private void changeStatus(DisputeCase dispute, DisputeStatus target, String correlationId) {
        DisputeStatus oldStatus = dispute.getStatus();
        dispute.transitionTo(target, clock.instant());
        log.info("Dispute {} moved from {} to {} (correlationId={})", dispute.getDisputeId(), oldStatus, target,
                correlationId);
    }

    private DisputeCase load(UUID disputeId) {
        return disputeRepository.findById(disputeId).orElseThrow(() -> DisputeService.disputeNotFound(disputeId));
    }

    private static void requireStatus(DisputeCase dispute, DisputeStatus expected) {
        if (dispute.getStatus() != expected) {
            throw new ConflictException("INVALID_STATE_TRANSITION",
                    "Dispute " + dispute.getDisputeId() + " is " + dispute.getStatus() + ", expected " + expected);
        }
    }

    private static AssessmentOutcome requireOutcome(DisputeCase dispute) {
        if (dispute.getAssessmentOutcome() == null) {
            throw new ConflictException("NOT_ASSESSED", "Dispute " + dispute.getDisputeId() + " was not assessed yet");
        }
        return dispute.getAssessmentOutcome();
    }
}
