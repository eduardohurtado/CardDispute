package com.techmahindra.carddispute.notification.service;

import org.springframework.amqp.rabbit.connection.CorrelationData;

import com.techmahindra.carddispute.notification.entity.NotificationOutbox;

public interface RabbitMQEventPublisher {

    CorrelationData publish(NotificationOutbox event);
}
