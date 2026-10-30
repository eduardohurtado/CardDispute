package com.techmahindra.carddispute.transaction.service;

/**
 * Result of evaluating a disputed transaction against the suspected duplicate selected by the
 * customer.
 *
 * @param explanation non-sensitive text, used as rationale for automated decisions
 */
public record MatchAssessment(AssessmentOutcome outcome, String explanation) {}
