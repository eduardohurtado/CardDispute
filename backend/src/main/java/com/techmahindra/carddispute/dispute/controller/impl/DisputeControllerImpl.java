package com.techmahindra.carddispute.dispute.controller.impl;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.techmahindra.carddispute.common.web.CorrelationId;
import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.dispute.controller.DisputeController;
import com.techmahindra.carddispute.dispute.dto.CreateDisputeRequest;
import com.techmahindra.carddispute.dispute.dto.DisputeResponse;
import com.techmahindra.carddispute.dispute.dto.DisputeSummaryResponse;
import com.techmahindra.carddispute.dispute.dto.TimelineEntryResponse;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import com.techmahindra.carddispute.dispute.service.DisputeService;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.workflow.service.WorkflowService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DisputeControllerImpl implements DisputeController {

    private final DisputeService disputeService;
    private final WorkflowService workflowService;

    @Override
    public ResponseEntity<DisputeResponse> submit(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody CreateDisputeRequest request) {

        String correlationId = CorrelationId.current();

        DisputeResponse created = disputeService.submit(user, request, correlationId);

        String processInstanceId =
                workflowService.startDisputeProcess(created.disputeId(), correlationId);

        disputeService.associateWorkflowInstance(
                created.disputeId(), processInstanceId, correlationId);

        DisputeResponse current = disputeService.get(user, created.disputeId());

        return ResponseEntity.created(
                        ServletUriComponentsBuilder.fromCurrentRequest()
                                .path("/{id}")
                                .buildAndExpand(created.disputeId())
                                .toUri())
                .body(current);
    }

    @Override
    public PageResponse<DisputeSummaryResponse> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) DisputeStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return disputeService.list(user, status, pageable);
    }

    @Override
    public DisputeResponse get(
            @AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID disputeId) {
        return disputeService.get(user, disputeId);
    }

    @Override
    public List<TimelineEntryResponse> timeline(
            @AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID disputeId) {
        return disputeService.timeline(user, disputeId);
    }
}
