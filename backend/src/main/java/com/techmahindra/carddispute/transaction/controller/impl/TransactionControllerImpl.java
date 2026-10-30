package com.techmahindra.carddispute.transaction.controller.impl;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.transaction.controller.TransactionController;
import com.techmahindra.carddispute.transaction.dto.TransactionResponse;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;
import com.techmahindra.carddispute.transaction.service.TransactionService;

import lombok.RequiredArgsConstructor;

/** Customer view of their own synthetic card transactions. */
@RestController
@RequiredArgsConstructor
public class TransactionControllerImpl implements TransactionController {

    private final TransactionService transactionService;

    @Override
    public PageResponse<TransactionResponse> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) TransactionStatus status,
            @PageableDefault(size = 20, sort = "occurredAt", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return transactionService.listOwned(user.requireCustomerId(), status, pageable);
    }

    @Override
    public TransactionResponse get(
            @AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID transactionId) {
        return transactionService.getOwnedResponse(user.requireCustomerId(), transactionId);
    }
}
