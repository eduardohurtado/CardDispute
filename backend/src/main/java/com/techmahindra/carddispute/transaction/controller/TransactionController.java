package com.techmahindra.carddispute.transaction.controller;

import com.techmahindra.carddispute.common.security.AuthenticatedUser;
import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.transaction.dto.TransactionResponse;
import com.techmahindra.carddispute.transaction.entity.TransactionStatus;
import com.techmahindra.carddispute.transaction.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Customer view of their own synthetic card transactions. */
@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public PageResponse<TransactionResponse> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) TransactionStatus status,
            @PageableDefault(size = 20, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return transactionService.listOwned(user.requireCustomerId(), status, pageable);
    }

    @GetMapping("/{transactionId}")
    public TransactionResponse get(@AuthenticationPrincipal AuthenticatedUser user,
                                   @PathVariable UUID transactionId) {
        return transactionService.getOwnedResponse(user.requireCustomerId(), transactionId);
    }
}
