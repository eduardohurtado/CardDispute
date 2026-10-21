package com.techmahindra.carddispute.transaction.service;

/** Precomputed outcome used by the BPMN gateway; the rules that produce it live in Java. */
public enum AssessmentOutcome {
    SUPPORTED,
    NOT_SUPPORTED,
    MANUAL_REVIEW
}
