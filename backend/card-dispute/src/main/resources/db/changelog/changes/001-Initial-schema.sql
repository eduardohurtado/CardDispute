--liquibase formatted sql

--changeset juan:001-create-dispute splitStatements:true
IF
SCHEMA_ID(N'dispute') IS NULL
    EXEC(N'CREATE SCHEMA dispute');

CREATE TABLE dispute.customer
(
    customer_id  UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_customer PRIMARY KEY,
    display_name NVARCHAR(120) NOT NULL,
    email        NVARCHAR(254) NOT NULL,
    active       BIT              NOT NULL
        CONSTRAINT DF_customer_active DEFAULT (1),
    created_at   DATETIME2(3) NOT NULL
        CONSTRAINT DF_customer_created_at DEFAULT (SYSUTCDATETIME())
);

CREATE TABLE dispute.card_transaction
(
    transaction_id      UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_card_transaction PRIMARY KEY,
    customer_id         UNIQUEIDENTIFIER NOT NULL,
    card_last4          CHAR(4)          NOT NULL,
    merchant_name       NVARCHAR(160) NOT NULL,
    merchant_normalized NVARCHAR(160) NOT NULL,
    reference           NVARCHAR(80) NULL,
    amount              DECIMAL(19, 4)   NOT NULL,
    currency            CHAR(3)          NOT NULL,
    posted_at           DATETIME2(3) NULL,
    occurred_at         DATETIME2(3) NOT NULL,
    status              VARCHAR(16)      NOT NULL,
    created_at          DATETIME2(3) NOT NULL
        CONSTRAINT DF_card_transaction_created_at DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT FK_card_transaction_customer
        FOREIGN KEY (customer_id) REFERENCES dispute.customer (customer_id),
    CONSTRAINT CK_card_transaction_amount CHECK (amount > 0),
    CONSTRAINT CK_card_transaction_status
        CHECK (status IN ('POSTED', 'PENDING', 'REVERSED')),
    CONSTRAINT CK_card_transaction_currency
        CHECK (currency NOT LIKE '%[^A-Z]%')
);

CREATE INDEX IX_card_transaction_customer_posted
    ON dispute.card_transaction (customer_id, posted_at DESC);

CREATE INDEX IX_card_transaction_matching
    ON dispute.card_transaction
        (merchant_normalized, amount, currency, occurred_at);

CREATE TABLE dispute.dispute_case
(
    dispute_id               UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_dispute_case PRIMARY KEY,
    customer_id              UNIQUEIDENTIFIER NOT NULL,
    transaction_id           UNIQUEIDENTIFIER NOT NULL,
    candidate_transaction_id UNIQUEIDENTIFIER NULL,
    reason_code              VARCHAR(32)      NOT NULL,
    description              NVARCHAR(500) NULL,
    status                   VARCHAR(40)      NOT NULL,
    assessment_outcome       VARCHAR(24) NULL,
    workflow_instance_id     VARCHAR(64) NULL,
    created_at               DATETIME2(3) NOT NULL
        CONSTRAINT DF_dispute_case_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at               DATETIME2(3) NOT NULL
        CONSTRAINT DF_dispute_case_updated_at DEFAULT (SYSUTCDATETIME()),
    resolved_at              DATETIME2(3) NULL,
    version                  BIGINT           NOT NULL
        CONSTRAINT DF_dispute_case_version DEFAULT (0),

    CONSTRAINT FK_dispute_case_customer
        FOREIGN KEY (customer_id) REFERENCES dispute.customer (customer_id),
    CONSTRAINT FK_dispute_case_transaction
        FOREIGN KEY (transaction_id)
            REFERENCES dispute.card_transaction (transaction_id),
    CONSTRAINT FK_dispute_case_candidate_transaction
        FOREIGN KEY (candidate_transaction_id)
            REFERENCES dispute.card_transaction (transaction_id),
    CONSTRAINT CK_dispute_case_reason
        CHECK (reason_code = 'POSSIBLE_DUPLICATE'),
    CONSTRAINT CK_dispute_case_assessment_outcome
        CHECK (assessment_outcome IS NULL OR assessment_outcome IN
                                             ('SUPPORTED', 'NOT_SUPPORTED', 'MANUAL_REVIEW')),
    CONSTRAINT CK_dispute_case_version CHECK (version >= 0)
);

CREATE INDEX IX_dispute_case_customer_created
    ON dispute.dispute_case (customer_id, created_at DESC);

CREATE INDEX IX_dispute_case_status_created
    ON dispute.dispute_case (status, created_at);

CREATE UNIQUE INDEX UX_dispute_case_active_transaction
    ON dispute.dispute_case (transaction_id) WHERE status IN
      ('SUBMITTED', 'IN_REVIEW', 'AWAITING_ANALYST', 'TIMEOUT_REVIEW_REQUIRED');

CREATE TABLE dispute.dispute_decision
(
    decision_id     UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_dispute_decision PRIMARY KEY,
    dispute_id      UNIQUEIDENTIFIER NOT NULL,
    decision_type   VARCHAR(32)      NOT NULL,
    decision_source VARCHAR(16)      NOT NULL,
    rationale       NVARCHAR(1000) NOT NULL,
    decided_by      NVARCHAR(80) NOT NULL,
    decided_at      DATETIME2(3) NOT NULL
        CONSTRAINT DF_dispute_decision_decided_at DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT UQ_dispute_decision_dispute UNIQUE (dispute_id),
    CONSTRAINT FK_dispute_decision_case
        FOREIGN KEY (dispute_id) REFERENCES dispute.dispute_case (dispute_id),
    CONSTRAINT CK_dispute_decision_type
        CHECK (decision_type IN ('DUPLICATE_SUPPORTED', 'NOT_SUPPORTED')),
    CONSTRAINT CK_dispute_decision_source
        CHECK (decision_source IN ('AUTOMATED', 'ANALYST'))
);

CREATE TABLE dispute.dispute_audit_event
(
    audit_id       BIGINT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_dispute_audit_event PRIMARY KEY,
    dispute_id     UNIQUEIDENTIFIER NOT NULL,
    event_type     VARCHAR(60)      NOT NULL,
    old_status     VARCHAR(40) NULL,
    new_status     VARCHAR(40) NULL,
    actor_id       NVARCHAR(80) NOT NULL,
    correlation_id VARCHAR(64)      NOT NULL,
    details        NVARCHAR(1000) NULL,
    occurred_at    DATETIME2(3) NOT NULL
        CONSTRAINT DF_dispute_audit_event_occurred_at
        DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT FK_dispute_audit_event_case
        FOREIGN KEY (dispute_id) REFERENCES dispute.dispute_case (dispute_id)
);

CREATE INDEX IX_dispute_audit_event_dispute_occurred
    ON dispute.dispute_audit_event (dispute_id, occurred_at);

CREATE TABLE dispute.notification_outbox
(
    outbox_id       UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_notification_outbox PRIMARY KEY,
    dispute_id      UNIQUEIDENTIFIER NOT NULL,
    event_type      VARCHAR(40)      NOT NULL,
    payload         NVARCHAR(MAX) NOT NULL,
    status          VARCHAR(16)      NOT NULL
        CONSTRAINT DF_notification_outbox_status DEFAULT ('PENDING'),
    attempt_count   INT              NOT NULL
        CONSTRAINT DF_notification_outbox_attempt_count DEFAULT (0),
    next_attempt_at DATETIME2(3) NOT NULL,
    published_at    DATETIME2(3) NULL,
    created_at      DATETIME2(3) NOT NULL
        CONSTRAINT DF_notification_outbox_created_at
        DEFAULT (SYSUTCDATETIME()),
    last_error      NVARCHAR(500) NULL,

    CONSTRAINT FK_notification_outbox_case
        FOREIGN KEY (dispute_id) REFERENCES dispute.dispute_case (dispute_id),
    CONSTRAINT CK_notification_outbox_status
        CHECK (status IN ('PENDING', 'PUBLISHED', 'RETRY')),
    CONSTRAINT CK_notification_outbox_attempt_count
        CHECK (attempt_count >= 0),
    CONSTRAINT CK_notification_outbox_payload_json
        CHECK (ISJSON(payload) = 1)
);

CREATE INDEX IX_notification_outbox_status_next_attempt
    ON dispute.notification_outbox (status, next_attempt_at);

CREATE TABLE dispute.notification_delivery
(
    event_id     UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_notification_delivery PRIMARY KEY,
    dispute_id   UNIQUEIDENTIFIER NOT NULL,
    channel      VARCHAR(12)      NOT NULL,
    status       VARCHAR(20)      NOT NULL,
    processed_at DATETIME2(3) NOT NULL,
    provider_ref NVARCHAR(80) NULL,
    error_code   VARCHAR(60) NULL,

    CONSTRAINT FK_notification_delivery_case
        FOREIGN KEY (dispute_id) REFERENCES dispute.dispute_case (dispute_id),
    CONSTRAINT CK_notification_delivery_channel
        CHECK (channel = 'MOCK_EMAIL'),
    CONSTRAINT CK_notification_delivery_status
        CHECK (status IN ('DELIVERED', 'FAILED'))
);