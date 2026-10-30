package com.techmahindra.carddispute.notification.service.impl;

import java.time.temporal.ChronoUnit;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.techmahindra.carddispute.common.exception.ConflictException;
import com.techmahindra.carddispute.common.exception.ResourceNotFoundException;
import com.techmahindra.carddispute.notification.dto.NotificationReceiptRequest;
import com.techmahindra.carddispute.notification.entity.NotificationDelivery;
import com.techmahindra.carddispute.notification.entity.NotificationOutbox;
import com.techmahindra.carddispute.notification.repository.NotificationDeliveryRepository;
import com.techmahindra.carddispute.notification.repository.NotificationOutboxRepository;
import com.techmahindra.carddispute.notification.service.NotificationReceiptService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationReceiptServiceImpl implements NotificationReceiptService {

    private final NotificationDeliveryRepository deliveryRepository;
    private final NotificationOutboxRepository outboxRepository;

    @Override
    @Transactional(transactionManager = "cardDisputeTransactionManager")
    public boolean registerReceipt(NotificationReceiptRequest request) {

        validateReceipt(request);

        var processedAt = request.processedAt().truncatedTo(ChronoUnit.MILLIS);

        NotificationOutbox event =
                outboxRepository
                        .findById(request.eventId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "NOTIFICATION_EVENT_NOT_FOUND",
                                                "Notification event not found: "
                                                        + request.eventId()));

        if (!event.getDisputeId().equals(request.disputeId())) {
            throw new ConflictException(
                    "NOTIFICATION_DISPUTE_MISMATCH",
                    "Receipt disputeId does not match the outbox event");
        }

        var existing = deliveryRepository.findById(request.eventId());

        if (existing.isPresent()) {

            NotificationDelivery delivery = existing.get();

            boolean identical =
                    delivery.getDisputeId().equals(request.disputeId())
                            && Objects.equals(delivery.getChannel(), request.channel())
                            && Objects.equals(delivery.getStatus(), request.status())
                            && Objects.equals(delivery.getProcessedAt(), processedAt)
                            && Objects.equals(delivery.getProviderRef(), request.providerRef())
                            && Objects.equals(delivery.getErrorCode(), request.errorCode());

            if (!identical) {
                throw new ConflictException(
                        "NOTIFICATION_RECEIPT_CONFLICT",
                        "A different receipt already exists for event " + request.eventId());
            }

            return false;
        }

        deliveryRepository.saveAndFlush(
                NotificationDelivery.of(
                        request.eventId(),
                        request.disputeId(),
                        request.channel(),
                        request.status(),
                        processedAt,
                        request.providerRef(),
                        request.errorCode()));

        return true;
    }

    private void validateReceipt(NotificationReceiptRequest request) {

        if (!"MOCK_EMAIL".equals(request.channel())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Notification channel must be MOCK_EMAIL");
        }

        if (!"DELIVERED".equals(request.status()) && !"FAILED".equals(request.status())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Notification status must be DELIVERED or FAILED");
        }
    }
}
