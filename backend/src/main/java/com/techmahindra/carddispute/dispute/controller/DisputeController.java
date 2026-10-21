package com.techmahindra.carddispute.dispute.controller;

import com.techmahindra.carddispute.common.security.AuthenticatedUser;
import com.techmahindra.carddispute.common.web.CorrelationId;
import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.dispute.dto.CreateDisputeRequest;
import com.techmahindra.carddispute.dispute.dto.DisputeResponse;
import com.techmahindra.carddispute.dispute.dto.DisputeSummaryResponse;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.service.DisputeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/disputes")
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeService disputeService;

    @PostMapping
    public ResponseEntity<DisputeResponse> submit(@AuthenticationPrincipal AuthenticatedUser user,
                                                  @Valid @RequestBody CreateDisputeRequest request) {
        DisputeResponse created = disputeService.submit(user, request, CorrelationId.current());
        return ResponseEntity
                .created(ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                        .buildAndExpand(created.disputeId()).toUri())
                .body(created);
    }

    @GetMapping
    public PageResponse<DisputeSummaryResponse> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) DisputeStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return disputeService.list(user, status, pageable);
    }

    @GetMapping("/{disputeId}")
    public DisputeResponse get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID disputeId) {
        return disputeService.get(user, disputeId);
    }
}
