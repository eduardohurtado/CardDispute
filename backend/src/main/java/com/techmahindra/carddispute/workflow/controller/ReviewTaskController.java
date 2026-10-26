
package com.techmahindra.carddispute.workflow.controller;

import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.workflow.dto.CompleteManualReviewRequest;
import com.techmahindra.carddispute.workflow.dto.ManualReviewCompletionResponse;
import com.techmahindra.carddispute.workflow.dto.ReviewTaskResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(
        name = "Workflow - Manual Review",
        description = "Query pending manual review tasks for dispute analysts."
)
@SecurityRequirement(name = "basicAuth")
@RequestMapping("/api/v1/workflow/tasks")
public interface ReviewTaskController {

    @Operation(
            operationId = "listPendingReviewTasks",
            summary = "List pending manual review tasks",
            description = """
                    Returns a paginated list of active Camunda user tasks
                    associated with the Card Dispute manual review process.

                    Only authenticated dispute analysts can access this
                    endpoint.

                    The response includes task metadata, dispute correlation
                    and the manual review deadline status.
                    """
    )
    @ApiResponse(
            responseCode = "200",
            description = "Pending review tasks retrieved.",
            content = @Content(
                    schema = @Schema(
                            implementation = PageResponse.class
                    )
            )
    )
    @ApiResponse(
            responseCode = "400",
            description = "Invalid pagination parameters.",
            content = @Content(
                    schema = @Schema(
                            implementation = ProblemDetail.class
                    )
            )
    )
    @ApiResponse(
            responseCode = "401",
            description = "Authentication required."
    )
    @ApiResponse(
            responseCode = "403",
            description = "Dispute analyst role required."
    )
    @GetMapping
    PageResponse<ReviewTaskResponse> listPendingTasks(

            @Parameter(
                    description = "Zero-based page index.",
                    example = "0"
            )
            @RequestParam(defaultValue = "0")
            int page,

            @Parameter(
                    description = "Page size, between 1 and 100.",
                    example = "20"
            )
            @RequestParam(defaultValue = "20")
            int size
    );

    @Operation(
            operationId = "getPendingReviewTask",
            summary = "Get a pending manual review task",
            description = """
                    Retrieves an active manual review task by its Camunda
                    task identifier.

                    A task that does not exist or is no longer active
                    returns HTTP 404.
                    """
    )
    @ApiResponse(
            responseCode = "200",
            description = "Pending review task retrieved.",
            content = @Content(
                    schema = @Schema(
                            implementation = ReviewTaskResponse.class
                    )
            )
    )
    @ApiResponse(
            responseCode = "401",
            description = "Authentication required."
    )
    @ApiResponse(
            responseCode = "403",
            description = "Dispute analyst role required."
    )
    @ApiResponse(
            responseCode = "404",
            description = "Pending review task not found.",
            content = @Content(
                    schema = @Schema(
                            implementation = ProblemDetail.class
                    )
            )
    )
    @GetMapping("/{taskId}")
    ReviewTaskResponse getPendingTask(

            @Parameter(
                    description = "Unique identifier of the Camunda user task.",
                    required = true,
                    example = "f21b8666-d168-11f1-86a2-50bbb58e700e"
            )
            @PathVariable
            String taskId
    );


    @Operation(
            operationId = "completeManualReviewTask",
            summary = "Complete a manual review task",
            description = """
                Validates an analyst decision and completes the
                Camunda User Task.

                The banking resolution is processed asynchronously
                by the workflow continuation.

                HTTP 202 confirms task completion acceptance,
                not final banking resolution.
                """
    )
    @ApiResponse(
            responseCode = "202",
            description = "Task completion accepted.",
            content = @Content(
                    schema = @Schema(
                            implementation = ManualReviewCompletionResponse.class
                    )
            )
    )
    @ApiResponse(
            responseCode = "400",
            description = "Invalid request payload."
    )
    @ApiResponse(
            responseCode = "401",
            description = "Authentication required."
    )
    @ApiResponse(
            responseCode = "403",
            description = "Dispute analyst role required."
    )
    @ApiResponse(
            responseCode = "404",
            description = "Pending review task not found."
    )
    @ApiResponse(
            responseCode = "409",
            description = "Invalid business state or dispute correlation."
    )
    @PostMapping("/{taskId}/complete")
    ResponseEntity<ManualReviewCompletionResponse> completeManualReview(

            @PathVariable String taskId,

            @Valid @RequestBody CompleteManualReviewRequest request,

            @AuthenticationPrincipal AuthenticatedUser analyst
    );

}
