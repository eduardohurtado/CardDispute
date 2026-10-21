
USE card_dispute_db;
GO

-- CAMUNDA
IF SCHEMA_ID(N'card_dispute_camunda_schema') IS NULL
BEGIN
    EXEC(
        'CREATE SCHEMA card_dispute_camunda_schema'
    );
END;
GO

-- BUSINESS
IF SCHEMA_ID(N'card_dispute_business_schema') IS NULL
BEGIN
    EXEC(
        'CREATE SCHEMA card_dispute_business_schema'
    );
END;
GO

-- LIQUIBASE
IF SCHEMA_ID(N'card_dispute_liquibase_schema') IS NULL
BEGIN
    EXEC(
        'CREATE SCHEMA card_dispute_liquibase_schema'
    );
END;
GO

SELECT
    name AS SchemaName
FROM sys.schemas
WHERE name IN (
    'card_dispute_camunda_schema',
    'card_dispute_business_schema',
    'card_dispute_liquibase_schema'
);
GO
