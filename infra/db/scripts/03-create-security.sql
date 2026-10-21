
/*
========================================================
 CARD DISPUTE POC - SECURITY INITIALIZATION
========================================================

 Database: card_dispute_db

 Logins:
 - card_dispute_camunda_login
 - card_dispute_business_login
 - card_dispute_liquibase_login

 Users:
 - card_dispute_camunda_user
 - card_dispute_business_user
 - card_dispute_liquibase_user

 SQLCMD variables:
 - CAMUNDA_DB_PASSWORD
 - BUSINESS_DB_PASSWORD
 - LIQUIBASE_DB_PASSWORD

========================================================
*/

-- =====================================================
-- 1. CREATE SERVER LOGINS
-- =====================================================

USE master;
GO

-- CAMUNDA LOGIN
IF NOT EXISTS (
    SELECT 1
    FROM sys.sql_logins
    WHERE name = N'card_dispute_camunda_login'
)
BEGIN
    CREATE LOGIN card_dispute_camunda_login
    WITH PASSWORD = '$(CAMUNDA_DB_PASSWORD)',
         CHECK_POLICY = ON;

    PRINT 'Camunda login created.';
END
ELSE
    PRINT 'Camunda login already exists.';
GO


-- BUSINESS LOGIN
IF NOT EXISTS (
    SELECT 1
    FROM sys.sql_logins
    WHERE name = N'card_dispute_business_login'
)
BEGIN
    CREATE LOGIN card_dispute_business_login
    WITH PASSWORD = '$(BUSINESS_DB_PASSWORD)',
         CHECK_POLICY = ON;

    PRINT 'Business login created.';
END
ELSE
    PRINT 'Business login already exists.';
GO


-- LIQUIBASE LOGIN
IF NOT EXISTS (
    SELECT 1
    FROM sys.sql_logins
    WHERE name = N'card_dispute_liquibase_login'
)
BEGIN
    CREATE LOGIN card_dispute_liquibase_login
    WITH PASSWORD = '$(LIQUIBASE_DB_PASSWORD)',
         CHECK_POLICY = ON;

    PRINT 'Liquibase login created.';
END
ELSE
    PRINT 'Liquibase login already exists.';
GO


-- =====================================================
-- 2. CREATE DATABASE USERS
-- =====================================================

USE card_dispute_db;
GO

-- CAMUNDA USER
IF DATABASE_PRINCIPAL_ID(
    N'card_dispute_camunda_user'
) IS NULL
BEGIN
    CREATE USER card_dispute_camunda_user
    FOR LOGIN card_dispute_camunda_login
    WITH DEFAULT_SCHEMA = card_dispute_camunda_schema;

    PRINT 'Camunda user created.';
END;
GO

-- BUSINESS USER
IF DATABASE_PRINCIPAL_ID(
    N'card_dispute_business_user'
) IS NULL
BEGIN
    CREATE USER card_dispute_business_user
    FOR LOGIN card_dispute_business_login
    WITH DEFAULT_SCHEMA = card_dispute_business_schema;

    PRINT 'Business user created.';
END;
GO

-- LIQUIBASE USER
IF DATABASE_PRINCIPAL_ID(
    N'card_dispute_liquibase_user'
) IS NULL
BEGIN
    CREATE USER card_dispute_liquibase_user
    FOR LOGIN card_dispute_liquibase_login
    WITH DEFAULT_SCHEMA = card_dispute_business_schema;

    PRINT 'Liquibase user created.';
END;
GO


-- =====================================================
-- 3. CAMUNDA PERMISSIONS
-- =====================================================

GRANT CREATE TABLE
TO card_dispute_camunda_user;
GO

GRANT SELECT, INSERT, UPDATE, DELETE
ON SCHEMA::card_dispute_camunda_schema
TO card_dispute_camunda_user;
GO

GRANT ALTER, CONTROL, REFERENCES
ON SCHEMA::card_dispute_camunda_schema
TO card_dispute_camunda_user;
GO


-- =====================================================
-- 4. BUSINESS PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON SCHEMA::card_dispute_business_schema
TO card_dispute_business_user;
GO


-- =====================================================
-- 5. LIQUIBASE PERMISSIONS
-- =====================================================

GRANT CREATE TABLE
TO card_dispute_liquibase_user;
GO

-- Business schema
GRANT ALTER, CONTROL, REFERENCES
ON SCHEMA::card_dispute_business_schema
TO card_dispute_liquibase_user;
GO

-- Liquibase schema
GRANT ALTER, CONTROL, REFERENCES
ON SCHEMA::card_dispute_liquibase_schema
TO card_dispute_liquibase_user;
GO


-- =====================================================
-- 6. VALIDATION
-- =====================================================

PRINT 'Validating database users...';

SELECT
    dp.name AS UserName,
    dp.type_desc AS UserType,
    dp.default_schema_name AS DefaultSchema
FROM sys.database_principals dp
WHERE dp.name IN (
    'card_dispute_camunda_user',
    'card_dispute_business_user',
    'card_dispute_liquibase_user'
);
GO

PRINT 'Validating assigned permissions...';

SELECT
    USER_NAME(p.grantee_principal_id) AS UserName,
    p.permission_name AS PermissionName,
    p.state_desc AS PermissionState,
    CASE
        WHEN p.class = 3
        THEN SCHEMA_NAME(p.major_id)
        WHEN p.class = 0
        THEN 'DATABASE'
        ELSE 'OTHER'
    END AS Securable
FROM sys.database_permissions p
WHERE USER_NAME(p.grantee_principal_id) IN (
    'card_dispute_camunda_user',
    'card_dispute_business_user',
    'card_dispute_liquibase_user'
)
ORDER BY UserName, Securable, PermissionName;
GO

PRINT 'Security initialization completed.';
GO
