package com.techmahindra.carddispute.notification.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techmahindra.carddispute.notification.dto.DisputeResolvedEvent;
import com.techmahindra.carddispute.notification.entity.NotificationOutbox;
import com.techmahindra.carddispute.notification.repository.NotificationOutboxRepository;
import com.techmahindra.carddispute.notification.service.NotificationOutboxService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationOutboxServiceImpl implements NotificationOutboxService {

    private final NotificationOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(
            transactionManager = "cardDisputeTransactionManager",
            propagation = Propagation.MANDATORY)
    public void saveDisputeResolvedEvent(DisputeResolvedEvent event) {

        final String payload;

        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(
                    "Could not serialize outbox event for dispute " + event.disputeId(), e);
        }

        outboxRepository.save(
                NotificationOutbox.pending(
                        event.eventId(),
                        event.disputeId(),
                        event.eventType(),
                        payload,
                        event.occurredAt()));
    }
}
