ALTER TABLE ${businessSchemaName}.notification_outbox
DROP CONSTRAINT CK_notification_outbox_status;

ALTER TABLE ${businessSchemaName}.notification_outbox
    ADD CONSTRAINT CK_notification_outbox_status
        CHECK (
            status IN (
                       'PENDING',
                       'PUBLISHED',
                       'RETRY',
                       'FAILED'
                )
            );
