package com.techmahindra.carddispute.transaction.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
        name = "TransactionResponse",
        description = "Card transaction details visible to the customer.")
public record TransactionResponse(
        @Schema(
                        description = "Unique transaction identifier.",
                        example = "aaaaaaaa-0000-0000-0000-000000000001")
                UUID transactionId,
        @Schema(description = "Last four digits of the card.", example = "1234") String cardLast4,
        @Schema(
                        description = "Merchant name displayed in the transaction.",
                        example = "CAFE AROMA BOGOTA 001")
                String merchantName,
        @Schema(description = "Transaction reference.", example = "CAFE-001") String reference,
        @Schema(description = "Transaction amount.", example = "35000.00") BigDecimal amount,
        @Schema(description = "ISO 4217 transaction currency.", example = "COP") String currency,
        @Schema(description = "Current transaction status.", example = "POSTED")
                TransactionStatus status,
        @Schema(
                        description = "Date and time when the transaction occurred, in UTC.",
                        type = "string",
                        format = "date-time",
                        example = "2026-10-22T12:30:00Z")
                Instant occurredAt,
        @Schema(
                        description =
                                "Date and time when the transaction was posted, in UTC. Can be absent.",
                        type = "string",
                        format = "date-time",
                        nullable = true)
                Instant postedAt) {

    public static TransactionResponse from(CardTransaction transaction) {

        return new TransactionResponse(
                transaction.getTransactionId(),
                transaction.getCardLast4(),
                transaction.getMerchantName(),
                transaction.getReference(),
                transaction.getAmount(),
                transaction.getCurrency(),
                transaction.getStatus(),
                transaction.getOccurredAt(),
                transaction.getPostedAt());
    }
}
