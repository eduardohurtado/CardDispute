
package com.techmahindra.carddispute.workflow.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

@Schema(description = "Acknowledgement of manual review task completion.")
public record ManualReviewCompletionResponse(

        @Schema(description = "Completed Camunda task identifier.")
        String taskId,

        @Schema(description = "Associated business dispute identifier.")
        UUID disputeId,

        @Schema(description = "Camunda process instance identifier.")
        String processInstanceId,

        @Schema(
                description = "Workflow completion status.",
                example = "ACCEPTED"
        )
        String status

) {
}
