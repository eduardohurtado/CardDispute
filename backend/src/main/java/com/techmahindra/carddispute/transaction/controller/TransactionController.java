package com.techmahindra.carddispute.transaction.controller;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.transaction.dto.TransactionResponse;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(
        name = "Transactions",
        description = "Query card transactions owned by the authenticated customer.")
@SecurityRequirement(name = "basicAuth")
@RequestMapping("/api/v1/transactions")
public interface TransactionController {

    @Operation(
            operationId = "listTransactions",
            summary = "List my card transactions",
            description =
                    """
                    Returns the authenticated customer's card transactions.

                    Supports filtering by transaction status and pagination.
                    Default ordering: occurredAt descending.
                    """)
    @ApiResponse(responseCode = "200", description = "Paginated list of transactions.")
    @ApiResponse(responseCode = "401", description = "Authentication required.")
    @ApiResponse(responseCode = "403", description = "Customer role required.")
    @GetMapping
    PageResponse<TransactionResponse> list(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user,
            @Parameter(description = "Optional transaction status filter.", example = "POSTED")
                    @RequestParam(required = false)
                    TransactionStatus status,
            @Parameter(hidden = true)
                    @PageableDefault(
                            size = 20,
                            sort = "occurredAt",
                            direction = Sort.Direction.DESC)
                    Pageable pageable);

    @Operation(
            operationId = "getTransaction",
            summary = "Get transaction details",
            description =
                    """
                    Returns a transaction owned by the authenticated customer.

                    Transactions belonging to another customer are not
                    exposed through this endpoint.
                    """)
    @ApiResponse(
            responseCode = "200",
            description = "Transaction details retrieved.",
            content = @Content(schema = @Schema(implementation = TransactionResponse.class)))
    @ApiResponse(responseCode = "401", description = "Authentication required.")
    @ApiResponse(responseCode = "403", description = "Customer role required.")
    @ApiResponse(responseCode = "404", description = "Transaction not found or not accessible.")
    @GetMapping("/{transactionId}")
    TransactionResponse get(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user,
            @Parameter(
                            in = ParameterIn.PATH,
                            description = "Unique transaction identifier.",
                            required = true,
                            example = "550e8400-e29b-41d4-a716-446655440001")
                    @PathVariable
                    UUID transactionId);
}
