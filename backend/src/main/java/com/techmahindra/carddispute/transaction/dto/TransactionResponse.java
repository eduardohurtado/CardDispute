package com.techmahindra.carddispute.transaction.dto;

import com.techmahindra.carddispute.transaction.entity.CardTransaction;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
        UUID transactionId,
        String cardLast4,
        String merchantName,
        String reference,
        BigDecimal amount,
        String currency,
        TransactionStatus status,
        Instant occurredAt,
        Instant postedAt
) {

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
