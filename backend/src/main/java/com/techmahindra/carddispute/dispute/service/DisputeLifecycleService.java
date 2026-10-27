package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.common.exception.BusinessRuleViolationException;
import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.dispute.entity.AuditEventType;
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
    /** dispute_decision.rationale is NVARCHAR(1000). */
    private static final int MAX_RATIONALE_LENGTH = 1000;

    private final DisputeCaseRepository disputeRepository;
    private final DisputeDecisionRepository decisionRepository;
    private final DisputeAuditService auditService;
    private final TransactionService transactionService;
    private final DuplicateMatchingService matchingService;
    private final Clock clock;

    /** SUBMITTED -> IN_REVIEW. */
    @Transactional(transactionManager = "cardDisputeTransactionManager")
    public void markInReview(UUID disputeId, String correlationId) {
        DisputeCase dispute = load(disputeId);
        if (dispute.getStatus() == DisputeStatus.IN_REVIEW) {
            return;
        }
        changeStatus(dispute, DisputeStatus.IN_REVIEW, correlationId);
    }

    /** Runs the synthetic matching rules and stores the outcome used by the BPMN gateway. */
    @Transactional(transactionManager = "cardDisputeTransactionManager")
    public AssessmentOutcome assess(UUID disputeId, String correlationId) {
        DisputeCase dispute = load(disputeId);
        requireStatus(dispute, DisputeStatus.IN_REVIEW);

        MatchAssessment assessment = evaluate(dispute);
        Instant now = clock.instant();
        dispute.recordAssessment(assessment.outcome(), now);
        auditService.record(disputeId, AuditEventType.ASSESSED, dispute.getStatus(), dispute.getStatus(),
                SYSTEM_ACTOR, correlationId, assessment.outcome() + ": " + assessment.explanation(), now);

        log.info("Dispute {} assessed as {}: {} (correlationId={})", disputeId, assessment.outcome(),
                assessment.explanation(), correlationId);
        return assessment.outcome();
    }

    /** IN_REVIEW -> RESOLVED_* for SUPPORTED / NOT_SUPPORTED outcomes, with an AUTOMATED decision. */
    @Transactional(transactionManager = "cardDisputeTransactionManager")
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
        DisputeStatus oldStatus = dispute.getStatus();
        dispute.transitionTo(decisionType.resultingStatus(), now);
        decisionRepository.save(DisputeDecision.of(disputeId, decisionType, DecisionSource.AUTOMATED, rationale,
                SYSTEM_ACTOR, now));
        auditService.record(disputeId, AuditEventType.DECIDED, oldStatus, dispute.getStatus(), SYSTEM_ACTOR,
                correlationId, decisionType + ": " + rationale, now);
        // Increment 3: save the notification outbox event here, in this same transaction

        log.info("Dispute {} resolved automatically as {} (correlationId={})", disputeId, decisionType, correlationId);
    }

    /** IN_REVIEW -> AWAITING_ANALYST for MANUAL_REVIEW outcomes. */
    @Transactional(transactionManager = "cardDisputeTransactionManager")
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

    /**
     * Checks that an analyst can decide the dispute now, without changing it. Lets the API reject a
     * decision before the Camunda task is completed.
     */
    @Transactional(transactionManager = "cardDisputeTransactionManager", readOnly = true)
    public void validateAnalystDecision(UUID disputeId, DecisionType decisionType, String rationale,
                                        String analystId) {
        requireAnalystDecisionInput(decisionType, rationale, analystId);
        requireAwaitingAnalystDecision(load(disputeId));
    }

    /**
     * AWAITING_ANALYST / TIMEOUT_REVIEW_REQUIRED -> RESOLVED_* with an ANALYST decision. A repeated call for
     * an already recorded analyst decision is a no-op (retried service task).
     */
    @Transactional(transactionManager = "cardDisputeTransactionManager")
    public void resolveByAnalyst(UUID disputeId, DecisionType decisionType, String rationale, String analystId,
                                 String correlationId) {
        requireAnalystDecisionInput(decisionType, rationale, analystId);
        DisputeCase dispute = load(disputeId);
        boolean alreadyDecidedByAnalyst = decisionRepository.findByDisputeId(disputeId)
                .filter(decision -> decision.getDecisionSource() == DecisionSource.ANALYST)
                .isPresent();
        if (dispute.getStatus().isTerminal() && alreadyDecidedByAnalyst) {
            return;
        }
        requireAwaitingAnalystDecision(dispute);

        String trimmedRationale = rationale.trim();
        Instant now = clock.instant();
        DisputeStatus oldStatus = dispute.getStatus();
        dispute.transitionTo(decisionType.resultingStatus(), now);
        decisionRepository.save(DisputeDecision.of(disputeId, decisionType, DecisionSource.ANALYST,
                trimmedRationale, analystId, now));
        auditService.record(disputeId, AuditEventType.DECIDED, oldStatus, dispute.getStatus(), analystId,
                correlationId, decisionType + ": " + trimmedRationale, now);
        // Increment 3: save the notification outbox event here, in this same transaction

        log.info("Dispute {} resolved by analyst {} as {} (correlationId={})", disputeId, analystId, decisionType,
                correlationId);
    }

    /**
     * AWAITING_ANALYST -> TIMEOUT_REVIEW_REQUIRED when the review deadline passes. This is an exception
     * state, not a verdict: the analyst task stays open and can still be decided. No-op when the dispute was
     * already flagged or decided (the timer can race with the analyst decision).
     */
    @Transactional(transactionManager = "cardDisputeTransactionManager")
    public void markReviewTimedOut(UUID disputeId, String correlationId) {
        DisputeCase dispute = load(disputeId);
        if (dispute.getStatus() != DisputeStatus.AWAITING_ANALYST) {
            log.info("Review deadline ignored for dispute {} in status {} (correlationId={})", disputeId,
                    dispute.getStatus(), correlationId);
            return;
        }
        changeStatus(dispute, DisputeStatus.TIMEOUT_REVIEW_REQUIRED, correlationId,
                "Analyst review deadline reached");
    }

    private static void requireAnalystDecisionInput(DecisionType decisionType, String rationale,
                                                    String analystId) {
        if (decisionType == null) {
            throw new BusinessRuleViolationException("DECISION_REQUIRED", "An analyst decision is required");
        }
        if (rationale == null || rationale.isBlank()) {
            throw new BusinessRuleViolationException("RATIONALE_REQUIRED",
                    "The analyst decision requires a rationale");
        }
        if (rationale.trim().length() > MAX_RATIONALE_LENGTH) {
            throw new BusinessRuleViolationException("RATIONALE_TOO_LONG",
                    "The rationale must be at most " + MAX_RATIONALE_LENGTH + " characters");
        }
        if (analystId == null || analystId.isBlank()) {
            throw new IllegalArgumentException("analystId must not be blank");
        }
    }

    /**
     * The dispute must be open, waiting for an analyst and assessed as MANUAL_REVIEW.
     */
    private static void requireAwaitingAnalystDecision(DisputeCase dispute) {
        if (dispute.getStatus().isTerminal()) {
            throw new ConflictException("DISPUTE_ALREADY_RESOLVED",
                    "Dispute " + dispute.getDisputeId() + " is already " + dispute.getStatus());
        }
        if (dispute.getStatus() != DisputeStatus.AWAITING_ANALYST
                && dispute.getStatus() != DisputeStatus.TIMEOUT_REVIEW_REQUIRED
                && dispute.getStatus() != DisputeStatus.IN_REVIEW) {
            throw new ConflictException("INVALID_STATE_TRANSITION",
                    "Dispute " + dispute.getDisputeId() + " is " + dispute.getStatus()
                            + " and cannot be decided by an analyst");
        }
        if (dispute.getAssessmentOutcome() != AssessmentOutcome.MANUAL_REVIEW) {
            throw new ConflictException("MANUAL_REVIEW_NOT_REQUIRED",
                    "Dispute " + dispute.getDisputeId() + " was not assessed for manual review");
        }
    }

    private MatchAssessment evaluate(DisputeCase dispute) {
        return matchingService.evaluate(transactionService.getById(dispute.getTransactionId()),
                transactionService.getById(dispute.getCandidateTransactionId()));
    }

    private void changeStatus(DisputeCase dispute, DisputeStatus target, String correlationId) {
        changeStatus(dispute, target, correlationId, null);
    }

    private void changeStatus(DisputeCase dispute, DisputeStatus target, String correlationId, String details) {
        Instant now = clock.instant();
        DisputeStatus oldStatus = dispute.getStatus();
        dispute.transitionTo(target, now);
        auditService.record(dispute.getDisputeId(), AuditEventType.STATE_CHANGED, oldStatus, target, SYSTEM_ACTOR,
                correlationId, details, now);
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
