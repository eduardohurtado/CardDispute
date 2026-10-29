package com.techmahindra.carddispute.notification.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NotificationReceiptRequest(
        @NotNull UUID eventId,
        @NotNull UUID disputeId,
        @NotBlank @Size(max = 12) String channel,
        @NotBlank @Size(max = 20) String status,
        @NotNull Instant processedAt,
        @Size(max = 80) String providerRef,
        @Size(max = 60) String errorCode) {}
