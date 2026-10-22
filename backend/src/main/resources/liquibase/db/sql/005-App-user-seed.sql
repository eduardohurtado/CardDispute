
SET NOCOUNT ON;

DECLARE @passwordHash VARCHAR(255) =
    '{bcrypt}$2y$12$j8hQMrLPx0faCTc/04Xnle5CFIy8n4vMst1RnYbhSMPueuYkpHJsO';

-- Ensure the expected synthetic customer dataset is present.
IF (
SELECT COUNT(*)
FROM ${businessSchemaName}.customer
WHERE email LIKE 'poc.customer[0-9][0-9][0-9]@example.test'
    ) <> 100
    THROW 51010,
        'SEC-01 requires the 100 synthetic customers from DATA-01',
        1;

-- One demo login per synthetic customer.
INSERT INTO ${businessSchemaName}.app_user
(
    user_id,
    username,
    password_hash,
    role,
    customer_id,
    enabled
)
SELECT
    NEWID(),
    REPLACE(
        LEFT(c.email, CHARINDEX('@', c.email) - 1),
            'poc.',
            ''
    ),
    @passwordHash,
    'CUSTOMER',
    c.customer_id,
    1
FROM ${businessSchemaName}.customer c
WHERE c.email LIKE
      'poc.customer[0-9][0-9][0-9]@example.test';

-- Independent analyst account.
INSERT INTO ${businessSchemaName}.app_user
(
    user_id,
    username,
    password_hash,
    role,
    customer_id,
    enabled
)
VALUES
    (
        NEWID(),
        'analyst001',
        @passwordHash,
        'DISPUTE_ANALYST',
        NULL,
        1
    );

-- Validate seed counts.
IF (
SELECT COUNT(*)
FROM ${businessSchemaName}.app_user
WHERE role = 'CUSTOMER'
    ) <> 100
    THROW 51011,
        'Expected 100 customer user accounts',
        1;

IF (
SELECT COUNT(*)
FROM ${businessSchemaName}.app_user
WHERE role = 'DISPUTE_ANALYST'
    ) <> 1
    THROW 51012,
        'Expected one analyst account',
        1;
