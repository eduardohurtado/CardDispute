SET NOCOUNT ON;

-- Permit the notification worker application role.
ALTER TABLE ${businessSchemaName}.app_user
DROP CONSTRAINT CK_app_user_role;

ALTER TABLE ${businessSchemaName}.app_user
    ADD CONSTRAINT CK_app_user_role
        CHECK (
            role IN (
                     'CUSTOMER',
                     'DISPUTE_ANALYST',
                     'NOTIFICATION_WORKER'
                )
            );

-- A technical worker must not be associated with a customer.
ALTER TABLE ${businessSchemaName}.app_user
DROP CONSTRAINT CK_app_user_role_customer;

ALTER TABLE ${businessSchemaName}.app_user
    ADD CONSTRAINT CK_app_user_role_customer
        CHECK (
            (role = 'CUSTOMER' AND customer_id IS NOT NULL)
                OR
            (
                role IN ('DISPUTE_ANALYST', 'NOTIFICATION_WORKER')
                    AND customer_id IS NULL
                )
            );

-- Create the technical application account.
IF NOT EXISTS (
    SELECT 1
    FROM ${businessSchemaName}.app_user
WHERE username = 'notification-worker'
)
BEGIN
INSERT INTO ${businessSchemaName}.app_user (
    user_id,
    username,
    password_hash,
    role,
    customer_id,
    enabled
)
VALUES (
           NEWID(),
           'notification-worker',
           '${notificationWorkerPasswordHash}',
           'NOTIFICATION_WORKER',
           NULL,
           1
       );
END;
