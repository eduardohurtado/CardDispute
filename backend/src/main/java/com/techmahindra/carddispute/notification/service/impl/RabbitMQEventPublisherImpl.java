package com.techmahindra.carddispute.notification.service.impl;

import java.nio.charset.StandardCharsets;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.techmahindra.carddispute.notification.entity.NotificationOutbox;
import com.techmahindra.carddispute.notification.service.RabbitMQEventPublisher;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RabbitMQEventPublisherImpl implements RabbitMQEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${application.notification.rabbitmq.exchange}")
    private String exchange;

    @Value("${application.notification.rabbitmq.routing-key}")
    private String routingKey;

    @Override
    public CorrelationData publish(NotificationOutbox event) {

        Message message =
                MessageBuilder.withBody(buildPayload(event.getPayload()))
                        .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                        .setContentEncoding(StandardCharsets.UTF_8.name())
                        .setMessageId(event.getOutboxId().toString())
                        .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                        .build();

        CorrelationData correlationData = new CorrelationData(event.getOutboxId().toString());

        rabbitTemplate.send(exchange, routingKey, message, correlationData);

        return correlationData;
    }

    private byte[] buildPayload(String payload) {
        try {
            ObjectNode envelope = objectMapper.createObjectNode();

            envelope.put("pattern", routingKey);
            envelope.set("data", objectMapper.readTree(payload));

            return objectMapper.writeValueAsBytes(envelope);

        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not build RabbitMQ message", e);
        }
    }
}
