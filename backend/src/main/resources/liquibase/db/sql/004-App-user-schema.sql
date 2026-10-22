
CREATE TABLE ${businessSchemaName}.app_user
(
    user_id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_app_user PRIMARY KEY,

    username VARCHAR(80) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    role VARCHAR(32) NOT NULL,

    customer_id UNIQUEIDENTIFIER NULL,

    enabled BIT NOT NULL
        CONSTRAINT DF_app_user_enabled DEFAULT (1),

    created_at DATETIME2(3) NOT NULL
        CONSTRAINT DF_app_user_created_at
        DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT UQ_app_user_username
        UNIQUE (username),

    CONSTRAINT FK_app_user_customer
        FOREIGN KEY (customer_id)
            REFERENCES ${businessSchemaName}.customer(customer_id),

    CONSTRAINT CK_app_user_role
        CHECK (role IN ('CUSTOMER', 'DISPUTE_ANALYST')),

    CONSTRAINT CK_app_user_role_customer
        CHECK (
            (role = 'CUSTOMER' AND customer_id IS NOT NULL)
                OR
            (role = 'DISPUTE_ANALYST' AND customer_id IS NULL)
            ),

    CONSTRAINT CK_app_user_password_hash
        CHECK (LEN(password_hash) > 0)
);

CREATE UNIQUE INDEX UX_app_user_customer
    ON ${businessSchemaName}.app_user(customer_id)
    WHERE customer_id IS NOT NULL;
