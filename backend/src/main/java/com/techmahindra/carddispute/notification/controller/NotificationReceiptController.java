package com.techmahindra.carddispute.notification.controller;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import com.techmahindra.carddispute.notification.dto.NotificationReceiptRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(
        name = "Notifications - Internal",
        description = "Restricted notification worker receipt callback")
@SecurityRequirement(name = "basicAuth")
@RequestMapping("/internal/v1/notification-receipts")
public interface NotificationReceiptController {

    @Operation(
            operationId = "registerNotificationReceipt",
            summary = "Register a notification delivery receipt",
            description =
                    """
                    Registers a notification processing result.
                    Requires the NOTIFICATION_WORKER role.
                    Repeated identical receipts are idempotent.
                    """)
    @ApiResponse(responseCode = "201", description = "Receipt created")
    @ApiResponse(responseCode = "200", description = "Receipt already registered")
    @ApiResponse(responseCode = "400", description = "Invalid receipt")
    @ApiResponse(responseCode = "401", description = "Authentication required")
    @ApiResponse(responseCode = "403", description = "Worker role required")
    @ApiResponse(responseCode = "404", description = "Outbox event not found")
    @ApiResponse(responseCode = "409", description = "Conflicting receipt")
    @PostMapping
    ResponseEntity<Void> registerReceipt(@Valid @RequestBody NotificationReceiptRequest request);
}
