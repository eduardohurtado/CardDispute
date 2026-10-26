
package com.techmahindra.carddispute.workflow.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Pending manual review task information.")
public record ReviewTaskResponse(

        @Schema(
                description = "Unique identifier of the Camunda user task.",
                example = "f21b8666-d168-11f1-86a2-50bbb58e700e"
        )
        String taskId,

        @Schema(
                description = "Business identifier of the associated dispute.",
                example = "4d1b89ce-1b1a-401d-9dcd-777ab3fbdac4"
        )
        UUID disputeId,

        @Schema(
                description = "Identifier of the Camunda process instance.",
                example = "627511b9-d164-11f1-b9ed-50bbb58e700e"
        )
        String processInstanceId,

        @Schema(
                description = "BPMN task definition key.",
                example = "Task_ManualReview"
        )
        String taskDefinitionKey,

        @Schema(
                description = "Human-readable task name.",
                example = "Review disputed transaction"
        )
        String taskName,

        @Schema(
                description = "Username assigned to the task, if any.",
                example = "analyst001",
                nullable = true
        )
        String assignee,

        @Schema(
                description = "Date and time when the task was created.",
                example = "2026-10-26T18:13:29Z"
        )
        Instant createdAt,

        @Schema(
                description = "Indicates whether the manual review deadline has expired.",
                example = "false"
        )
        boolean overdue

) {
}
