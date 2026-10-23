
package com.techmahindra.carddispute.dispute.controller;

import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.dispute.dto.CreateDisputeRequest;
import com.techmahindra.carddispute.dispute.dto.DisputeResponse;
import com.techmahindra.carddispute.dispute.dto.DisputeSummaryResponse;
import com.techmahindra.carddispute.dispute.dto.TimelineEntryResponse;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(
        name = "Disputes",
        description = "Create and query card disputes owned by the authenticated customer."
)
@SecurityRequirement(name = "basicAuth")
@RequestMapping("/api/v1/disputes")
public interface DisputeController {

    @Operation(
            operationId = "submitDispute",
            summary = "Submit a card dispute",
            description = """
                    Creates a dispute for a posted transaction and its
                    suspected duplicate.

                    The customer is obtained from the authenticated principal.
                    The workflow is started after dispute creation.

                    Automatic assessment may finish synchronously, so the
                    returned status can already be a final resolution.
                    """,
            responses = {
                    @ApiResponse(
                            responseCode = "201",
                            description = "Dispute created; current business state returned.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = DisputeResponse.class
                                    )
                            )
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "Invalid request payload.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ProblemDetail.class
                                    )
                            )
                    ),
                    @ApiResponse(
                            responseCode = "401",
                            description = "Authentication required."
                    ),
                    @ApiResponse(
                            responseCode = "409",
                            description = "An open dispute already exists or another conflict occurred.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ProblemDetail.class
                                    )
                            )
                    ),
                    @ApiResponse(
                            responseCode = "422",
                            description = "The transaction is not eligible for dispute.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ProblemDetail.class
                                    )
                            )
                    ),
                    @ApiResponse(
                            responseCode = "500",
                            description = "Unexpected technical or workflow failure.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ProblemDetail.class
                                    )
                            )
                    )
            }
    )
    @PostMapping
    ResponseEntity<DisputeResponse> submit(
            @Parameter(hidden = true)
            @AuthenticationPrincipal AuthenticatedUser user,

            @Valid @RequestBody CreateDisputeRequest request
    );

    @Operation(
            operationId = "listDisputes",
            summary = "List my disputes",
            description = """
                    Returns disputes belonging to the authenticated customer.

                    Results are paginated and can be filtered by
                    dispute status. Default ordering: createdAt descending.
                    """
    )
    @ApiResponse(
            responseCode = "200",
            description = "Paginated dispute list."
    )
    @ApiResponse(
            responseCode = "401",
            description = "Authentication required."
    )
    @GetMapping
    PageResponse<DisputeSummaryResponse> list(
            @Parameter(hidden = true)
            @AuthenticationPrincipal AuthenticatedUser user,

            @Parameter(
                    description = "Optional dispute status filter.",
                    example = "IN_REVIEW"
            )
            @RequestParam(required = false)
            DisputeStatus status,

            @Parameter(hidden = true)
            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable
    );

    @Operation(
            operationId = "getDispute",
            summary = "Get dispute details",
            description = """
                    Returns the full dispute details, including both
                    transactions, current assessment, and decision
                    if a final decision has been recorded.
                    """
    )
    @ApiResponse(
            responseCode = "200",
            description = "Dispute details retrieved.",
            content = @Content(
                    schema = @Schema(
                            implementation = DisputeResponse.class
                    )
            )
    )
    @ApiResponse(
            responseCode = "401",
            description = "Authentication required."
    )
    @ApiResponse(
            responseCode = "404",
            description = "Dispute not found or not accessible."
    )
    @GetMapping("/{disputeId}")
    DisputeResponse get(
            @Parameter(hidden = true)
            @AuthenticationPrincipal AuthenticatedUser user,

            @Parameter(
                    in = ParameterIn.PATH,
                    description = "Unique dispute identifier.",
                    required = true,
                    example = "550e8400-e29b-41d4-a716-446655440000"
            )
            @PathVariable UUID disputeId
    );

    @Operation(
            operationId = "getDisputeTimeline",
            summary = "Get dispute timeline",
            description = """
                    Returns the business audit events of the dispute in
                    chronological order: creation, workflow start, status
                    changes, assessment and decision.

                    This is the business audit trail, not the Camunda history.
                    """
    )
    @ApiResponse(
            responseCode = "200",
            description = "Timeline retrieved.",
            content = @Content(
                    array = @ArraySchema(
                            schema = @Schema(
                                    implementation = TimelineEntryResponse.class
                            )
                    )
            )
    )
    @ApiResponse(
            responseCode = "401",
            description = "Authentication required."
    )
    @ApiResponse(
            responseCode = "404",
            description = "Dispute not found or not accessible."
    )
    @GetMapping("/{disputeId}/timeline")
    List<TimelineEntryResponse> timeline(
            @Parameter(hidden = true)
            @AuthenticationPrincipal AuthenticatedUser user,

            @Parameter(
                    in = ParameterIn.PATH,
                    description = "Unique dispute identifier.",
                    required = true,
                    example = "550e8400-e29b-41d4-a716-446655440000"
            )
            @PathVariable UUID disputeId
    );
}
