USE master;
GO

IF DB_ID(N'card_dispute_db') IS NULL
BEGIN
    PRINT 'Creating card_dispute_db...';

    CREATE DATABASE card_dispute_db;
END
ELSE
BEGIN
    PRINT 'card_dispute_db already exists.';
END;
GO
