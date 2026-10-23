package com.techmahindra.carddispute.dispute.service;

import com.techmahindra.carddispute.common.exception.BusinessRuleViolationException;
import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.common.exception.ResourceNotFoundException;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.security.Role;
import com.techmahindra.carddispute.dispute.dto.CreateDisputeRequest;
import com.techmahindra.carddispute.dispute.dto.TimelineEntryResponse;
import com.techmahindra.carddispute.dispute.entity.AuditEventType;
import com.techmahindra.carddispute.dispute.entity.DisputeCase;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.entity.ReasonCode;
import com.techmahindra.carddispute.dispute.repository.DisputeCaseRepository;
import com.techmahindra.carddispute.dispute.repository.DisputeDecisionRepository;
import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;
import com.techmahindra.carddispute.transaction.repository.CardTransactionRepository;
import com.techmahindra.carddispute.transaction.service.DisputeRulesProperties;
import com.techmahindra.carddispute.transaction.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class DisputeServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-21T10:00:00Z");
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final AuthenticatedUser CUSTOMER =
            new AuthenticatedUser("customer01", "x", Role.CUSTOMER, CUSTOMER_ID);
    private static final AuthenticatedUser ANALYST =
            new AuthenticatedUser("analyst01", "x", Role.DISPUTE_ANALYST, null);

    private DisputeCaseRepository disputeRepository;
    private CardTransactionRepository transactionRepository;
    private DisputeAuditService auditService;
    private DisputeService service;

    @BeforeEach
    void setUp() {
        disputeRepository = mock(DisputeCaseRepository.class);
        transactionRepository = mock(CardTransactionRepository.class);
        DisputeDecisionRepository decisionRepository = mock(DisputeDecisionRepository.class);
        when(decisionRepository.findByDisputeId(any())).thenReturn(Optional.empty());

        TransactionService transactionService = new TransactionService(transactionRepository,
                new DisputeRulesProperties(Duration.ofDays(60), Duration.ofHours(1), Duration.ofHours(24), Map.of()));
        auditService = mock(DisputeAuditService.class);
        service = new DisputeService(disputeRepository, decisionRepository, auditService, transactionService,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void submitsEligibleDispute() {
        CardTransaction transaction = owned(posted(NOW.minus(Duration.ofDays(2))));
        CardTransaction candidate = owned(posted(NOW.minus(Duration.ofDays(2))));

        var response = service.submit(CUSTOMER,
                request(transaction.getTransactionId(), candidate.getTransactionId()), "corr-1");

        assertThat(response.status()).isEqualTo(DisputeStatus.SUBMITTED);
        assertThat(response.transaction().transactionId()).isEqualTo(transaction.getTransactionId());
        assertThat(response.candidateTransaction().transactionId()).isEqualTo(candidate.getTransactionId());
        ArgumentCaptor<DisputeCase> saved = ArgumentCaptor.forClass(DisputeCase.class);
        verify(disputeRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getCustomerId()).isEqualTo(CUSTOMER_ID);
        assertThat(saved.getValue().getCandidateTransactionId()).isEqualTo(candidate.getTransactionId());
        assertThat(saved.getValue().getDescription()).isEqualTo("charged twice");
        verify(auditService).record(eq(response.disputeId()), eq(AuditEventType.CREATED), isNull(),
                eq(DisputeStatus.SUBMITTED), eq("customer01"), eq("corr-1"), any(), eq(NOW));
    }

    @Test
    void associatingWorkflowInstanceIsAudited() {
        DisputeCase dispute = DisputeCase.submit(CUSTOMER_ID, UUID.randomUUID(), UUID.randomUUID(),
                ReasonCode.POSSIBLE_DUPLICATE, null, NOW);
        when(disputeRepository.findById(dispute.getDisputeId())).thenReturn(Optional.of(dispute));

        service.associateWorkflowInstance(dispute.getDisputeId(), "process-1", "corr-2");

        assertThat(dispute.getWorkflowInstanceId()).isEqualTo("process-1");
        verify(auditService).record(eq(dispute.getDisputeId()), eq(AuditEventType.WORKFLOW_STARTED), isNull(),
                isNull(), eq("SYSTEM"), eq("corr-2"), contains("process-1"), eq(NOW));
    }

    @Test
    void rejectsTransactionOfAnotherCustomerAsNotFound() {
        UUID foreignTransaction = UUID.randomUUID();
        when(transactionRepository.findByTransactionIdAndCustomerId(foreignTransaction, CUSTOMER_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(CUSTOMER, request(foreignTransaction, UUID.randomUUID()), "c"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(disputeRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsPendingTransaction() {
        CardTransaction pending = owned(builder(null).status(TransactionStatus.PENDING).build());

        assertThatThrownBy(() -> service.submit(CUSTOMER, request(pending.getTransactionId(), UUID.randomUUID()), "c"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasFieldOrPropertyWithValue("errorCode", "TRANSACTION_NOT_POSTED");
    }

    @Test
    void rejectsTransactionOutsideEligibilityWindow() {
        CardTransaction old = owned(posted(NOW.minus(Duration.ofDays(61))));

        assertThatThrownBy(() -> service.submit(CUSTOMER, request(old.getTransactionId(), UUID.randomUUID()), "c"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasFieldOrPropertyWithValue("errorCode", "DISPUTE_WINDOW_EXPIRED");
    }

    @Test
    void rejectsCandidateEqualToDisputedTransaction() {
        CardTransaction transaction = owned(posted(NOW.minus(Duration.ofDays(1))));

        assertThatThrownBy(() -> service.submit(CUSTOMER,
                request(transaction.getTransactionId(), transaction.getTransactionId()), "c"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasFieldOrPropertyWithValue("errorCode", "INVALID_CANDIDATE");
    }

    @Test
    void rejectsCandidateOfAnotherCustomer() {
        CardTransaction transaction = owned(posted(NOW.minus(Duration.ofDays(1))));
        UUID foreignCandidate = UUID.randomUUID();
        when(transactionRepository.findByTransactionIdAndCustomerId(foreignCandidate, CUSTOMER_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(CUSTOMER, request(transaction.getTransactionId(), foreignCandidate), "c"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasFieldOrPropertyWithValue("errorCode", "INVALID_CANDIDATE");
    }

    @Test
    void rejectsSecondOpenDisputeWithPrecheck() {
        CardTransaction transaction = owned(posted(NOW.minus(Duration.ofDays(1))));
        CardTransaction candidate = owned(posted(NOW.minus(Duration.ofDays(1))));
        when(disputeRepository.existsOpenDisputeInvolving(anyCollection(), anyCollection())).thenReturn(true);

        assertThatThrownBy(() -> service.submit(CUSTOMER,
                request(transaction.getTransactionId(), candidate.getTransactionId()), "c"))
                .isInstanceOf(ConflictException.class)
                .hasFieldOrPropertyWithValue("errorCode", "OPEN_DISPUTE_EXISTS");
        verify(disputeRepository, never()).saveAndFlush(any());
        verifyNoInteractions(auditService);
    }

    @Test
    void mapsUniqueIndexViolationToConflict() {
        CardTransaction transaction = owned(posted(NOW.minus(Duration.ofDays(1))));
        CardTransaction candidate = owned(posted(NOW.minus(Duration.ofDays(1))));
        when(disputeRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("UX"));

        assertThatThrownBy(() -> service.submit(CUSTOMER,
                request(transaction.getTransactionId(), candidate.getTransactionId()), "c"))
                .isInstanceOf(ConflictException.class)
                .hasFieldOrPropertyWithValue("errorCode", "OPEN_DISPUTE_EXISTS");
        verifyNoInteractions(auditService);
    }

    @Test
    void analystCannotSubmit() {
        assertThatThrownBy(() -> service.submit(ANALYST, request(UUID.randomUUID(), UUID.randomUUID()), "c"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void customerCannotReadAnotherCustomersDispute() {
        UUID disputeId = UUID.randomUUID();
        when(disputeRepository.findByDisputeIdAndCustomerId(disputeId, CUSTOMER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(CUSTOMER, disputeId)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void customerReadsTimelineOfOwnDispute() {
        DisputeCase dispute = DisputeCase.submit(CUSTOMER_ID, UUID.randomUUID(), UUID.randomUUID(),
                ReasonCode.POSSIBLE_DUPLICATE, null, NOW);
        when(disputeRepository.findByDisputeIdAndCustomerId(dispute.getDisputeId(), CUSTOMER_ID))
                .thenReturn(Optional.of(dispute));
        List<TimelineEntryResponse> timeline = List.of(new TimelineEntryResponse(AuditEventType.CREATED, null,
                DisputeStatus.SUBMITTED, "customer01", "Dispute submitted by customer", NOW));
        when(auditService.timeline(dispute.getDisputeId())).thenReturn(timeline);

        assertThat(service.timeline(CUSTOMER, dispute.getDisputeId())).isEqualTo(timeline);
    }

    @Test
    void customerCannotReadTimelineOfAnotherCustomersDispute() {
        UUID disputeId = UUID.randomUUID();
        when(disputeRepository.findByDisputeIdAndCustomerId(disputeId, CUSTOMER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.timeline(CUSTOMER, disputeId))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(auditService);
    }

    @Test
    void analystReadsTimelineOfAnyDispute() {
        DisputeCase dispute = DisputeCase.submit(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                ReasonCode.POSSIBLE_DUPLICATE, null, NOW);
        when(disputeRepository.findById(dispute.getDisputeId())).thenReturn(Optional.of(dispute));
        when(auditService.timeline(dispute.getDisputeId())).thenReturn(List.of());

        assertThat(service.timeline(ANALYST, dispute.getDisputeId())).isEmpty();
        verify(auditService).timeline(dispute.getDisputeId());
    }

    private CardTransaction owned(CardTransaction transaction) {
        when(transactionRepository.findByTransactionIdAndCustomerId(transaction.getTransactionId(), CUSTOMER_ID))
                .thenReturn(Optional.of(transaction));
        return transaction;
    }

    private static CreateDisputeRequest request(UUID transactionId, UUID candidateId) {
        return new CreateDisputeRequest(transactionId, candidateId, ReasonCode.POSSIBLE_DUPLICATE, "  charged twice ");
    }

    private static CardTransaction posted(Instant postedAt) {
        return builder(postedAt).build();
    }

    private static CardTransaction.CardTransactionBuilder builder(Instant postedAt) {
        return CardTransaction.builder()
                .transactionId(UUID.randomUUID())
                .customerId(CUSTOMER_ID)
                .cardLast4("4821")
                .merchantName("CAFE AROMA")
                .merchantNormalized("CAFE AROMA")
                .amount(new BigDecimal("35000"))
                .currency("COP")
                .occurredAt(NOW.minus(Duration.ofDays(3)))
                .postedAt(postedAt)
                .status(TransactionStatus.POSTED);
    }
}
