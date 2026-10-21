-- Keeps dispute_case.status aligned with the approved state machine (DisputeStatus enum).
ALTER TABLE ${businessSchemaName}.dispute_case
    ADD CONSTRAINT CK_dispute_case_status CHECK (status IN
        ('SUBMITTED', 'IN_REVIEW', 'AWAITING_ANALYST', 'TIMEOUT_REVIEW_REQUIRED',
         'RESOLVED_DUPLICATE_SUPPORTED', 'RESOLVED_NOT_SUPPORTED', 'REJECTED_INELIGIBLE'));

-- The customer always selects the suspected duplicate, and it must be a different charge.
ALTER TABLE ${businessSchemaName}.dispute_case
    ALTER COLUMN candidate_transaction_id UNIQUEIDENTIFIER NOT NULL;

ALTER TABLE ${businessSchemaName}.dispute_case
    ADD CONSTRAINT CK_dispute_case_candidate_distinct CHECK (candidate_transaction_id <> transaction_id);
