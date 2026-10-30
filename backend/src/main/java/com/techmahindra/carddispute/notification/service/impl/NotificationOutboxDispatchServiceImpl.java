package com.techmahindra.carddispute.notification.service.impl;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.techmahindra.carddispute.notification.entity.NotificationOutbox;
import com.techmahindra.carddispute.notification.repository.NotificationOutboxRepository;
import com.techmahindra.carddispute.notification.service.NotificationOutboxDispatchService;
import com.techmahindra.carddispute.notification.service.RabbitMQEventPublisher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationOutboxDispatchServiceImpl implements NotificationOutboxDispatchService {

    private final NotificationOutboxRepository outboxRepository;
    private final RabbitMQEventPublisher eventPublisher;

    @Value("${application.notification.outbox.confirm-timeout-seconds}")
    private long confirmTimeoutSeconds;

    @Value("${application.notification.outbox.max-attempts}")
    private int maxAttempts;

    @Override
    public int publishPendingBatch() {

        List<NotificationOutbox> pendingEvents =
                outboxRepository.findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                        NotificationOutbox.PENDING, Instant.now());

        if (pendingEvents.isEmpty()) {
            log.debug("No pending outbox events to publish");
            return 0;
        }

        int published = 0;

        for (NotificationOutbox event : pendingEvents) {
            try {
                CorrelationData correlationData = eventPublisher.publish(event);

                CorrelationData.Confirm confirm =
                        correlationData.getFuture().get(confirmTimeoutSeconds, TimeUnit.SECONDS);

                if (!confirm.isAck()) {
                    recordFailure(event, "RabbitMQ NACK: " + confirm.getReason());
                    continue;
                }

                if (correlationData.getReturned() != null) {
                    recordFailure(
                            event,
                            "Unroutable message: " + correlationData.getReturned().getReplyText());
                    continue;
                }

                int updated = outboxRepository.markPublished(event.getOutboxId(), Instant.now());

                if (updated != 1) {
                    throw new IllegalStateException(
                            "Could not mark outbox event as PUBLISHED: " + event.getOutboxId());
                }

                published++;

                log.info("Outbox event {} confirmed and marked PUBLISHED", event.getOutboxId());

            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();

                log.warn("Outbox dispatch interrupted for event {}", event.getOutboxId());
                break;

            } catch (ExecutionException | TimeoutException ex) {
                recordFailure(event, "RabbitMQ confirmation failed: " + ex.getMessage());

            } catch (org.springframework.amqp.AmqpException ex) {
                recordFailure(event, "RabbitMQ publication failed: " + ex.getMessage());
            }
        }

        log.info(
                "Outbox dispatch batch completed: selected={}, published={}",
                pendingEvents.size(),
                published);

        return published;
    }

    private void recordFailure(NotificationOutbox event, String reason) {
        int currentAttempts = event.getAttemptCount();
        int newAttemptCount = currentAttempts + 1;

        boolean exhausted = newAttemptCount >= maxAttempts;

        String nextStatus = exhausted ? NotificationOutbox.FAILED : NotificationOutbox.PENDING;

        Instant nextAttemptAt = event.getNextAttemptAt();

        if (!exhausted) {
            long delaySeconds = 30L * (1L << Math.min(currentAttempts, 3));

            nextAttemptAt = Instant.now().plusSeconds(delaySeconds);
        }

        String errorMessage =
                reason == null
                        ? "Unknown publication error"
                        : reason.substring(0, Math.min(reason.length(), 500));

        int updated =
                outboxRepository.recordPublicationFailure(
                        event.getOutboxId(),
                        nextStatus,
                        currentAttempts,
                        newAttemptCount,
                        nextAttemptAt,
                        errorMessage);

        if (updated != 1) {
            throw new IllegalStateException(
                    "Could not update publication failure for outbox event: "
                            + event.getOutboxId());
        }

        log.warn(
                "Outbox event {} publication failed: attempt={}, status={}, reason={}",
                event.getOutboxId(),
                newAttemptCount,
                nextStatus,
                errorMessage);
    }
}
