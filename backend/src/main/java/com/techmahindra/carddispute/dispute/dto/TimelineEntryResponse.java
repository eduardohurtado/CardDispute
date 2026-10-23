package com.techmahindra.carddispute.dispute.dto;

import com.techmahindra.carddispute.dispute.entity.AuditEventType;
import com.techmahindra.carddispute.dispute.entity.DisputeAuditEvent;
import com.techmahindra.carddispute.dispute.entity.DisputeStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(
        name = "TimelineEntryResponse",
        description = "Business audit event of a dispute, shown in its timeline."
)
public record TimelineEntryResponse(

        @Schema(
                description = "Type of business event.",
                example = "STATE_CHANGED"
        )
        AuditEventType eventType,

        @Schema(
                description = "Status before the event, if the event changed or refers to a status.",
                example = "SUBMITTED",
                nullable = true
        )
        DisputeStatus oldStatus,

        @Schema(
                description = "Status after the event, if the event changed or refers to a status.",
                example = "IN_REVIEW",
                nullable = true
        )
        DisputeStatus newStatus,

        @Schema(
                description = "User that triggered the event, or SYSTEM for automated steps.",
                example = "SYSTEM"
        )
        String actorId,

        @Schema(
                description = "Non-sensitive explanation of the event.",
                example = "SUPPORTED: Same merchant, amount and currency charged 10 min apart.",
                nullable = true
        )
        String details,

        @Schema(
                description = "Event timestamp in UTC.",
                type = "string",
                format = "date-time",
                example = "2026-10-22T12:35:00Z"
        )
        Instant occurredAt
) {

    public static TimelineEntryResponse from(
            DisputeAuditEvent event) {

        return new TimelineEntryResponse(
                event.getEventType(),
                event.getOldStatus(),
                event.getNewStatus(),
                event.getActorId(),
                event.getDetails(),
                event.getOccurredAt()
        );
    }
}
