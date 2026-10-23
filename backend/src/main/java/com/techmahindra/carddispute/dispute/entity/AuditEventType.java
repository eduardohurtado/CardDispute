package com.techmahindra.carddispute.dispute.entity;

/** Business events only; technical workflow events belong to logs and Camunda history. */
public enum AuditEventType {
    CREATED,
    STATE_CHANGED,
    ASSESSED,
    DECIDED
}
