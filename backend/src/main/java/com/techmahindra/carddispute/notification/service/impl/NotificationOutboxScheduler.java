package com.techmahindra.carddispute.notification.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.techmahindra.carddispute.notification.service.NotificationOutboxDispatchService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
@ConditionalOnProperty(
        prefix = "application.notification.outbox",
        name = "enabled",
        havingValue = "true")
public class NotificationOutboxScheduler {

    private final NotificationOutboxDispatchService dispatchService;

    @Scheduled(fixedDelayString = "${application.notification.outbox.poll-interval-ms:10000}")
    public void publishPendingEvents() {
        try {
            dispatchService.publishPendingBatch();
        } catch (Exception ex) {
            log.error("Outbox scheduled publication failed", ex);
        }
    }
}
