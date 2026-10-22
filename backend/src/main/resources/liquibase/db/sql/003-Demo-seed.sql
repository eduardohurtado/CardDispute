-- Card Dispute POC / Fresh test database only.
-- Complete replacement for liquibase/db/sql/003-Demo-seed.sql.
-- 100 synthetic customers, 10,000 card transactions (5,000 candidate pairs).
-- No records, identifiers, or demo scenarios from the previous seed are retained.
-- Not 30 million customers: the infographic's 30M/6M are business-scale assumptions,
-- while its explicit synthetic demo data target is 10,000 transactions.
-- Intentionally no disputes or decisions: scenarios remain reusable until submitted.
-- SQL Server; Liquibase sqlFile splitStatements:false, one execution batch.

SET NOCOUNT ON;

DECLARE @anchor DATETIME2(3) = DATEADD(DAY, -2, CONVERT(DATETIME2(3), CONVERT(date, SYSUTCDATETIME())));

-- Generate numbers 1..100 without loops or external tables.
;WITH digit AS (
    SELECT d FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) n(d)
), customers AS (
    SELECT tens.d * 10 + units.d + 1 AS n
    FROM digit tens CROSS JOIN digit units
)
 INSERT INTO ${businessSchemaName}.customer (customer_id, display_name, email, active)
SELECT CONVERT(uniqueidentifier, CONCAT('c0010000-0000-4000-8000-', RIGHT(CONCAT('000000000000', n), 12))),
       CONCAT(N'POC Customer ', RIGHT(CONCAT('000', n), 3)),
       CONCAT('poc.customer', RIGHT(CONCAT('000', n), 3), '@example.test'),
       1
FROM customers;

-- Scenario indexed by pair (1..50/customer); each pair provides original/candidate.
-- 0 SUPPORTED: same merchant, money, 10 min gap
-- 1 NOT_SUPPORTED: different amount
-- 2 MANUAL_REVIEW: high value (COP 3,500,000)
-- 3 MANUAL_REVIEW: 3-hour difference (between 1h/24h thresholds)
-- 4 SUPPORTED: same reference, merchant, money
-- 5 MANUAL_REVIEW: same reference but different amount
-- 6 MANUAL_REVIEW: related but nonidentical normalized merchant
-- 7 NOT_SUPPORTED: different merchant
-- 8 NOT_SUPPORTED: 30-hour difference
-- 9 NOT_SUPPORTED: different currency
-- 10 INELIGIBLE: original transaction PENDING
-- 11 INELIGIBLE: original POSTED more than 60 days ago
-- 12 SUPPORTED: matching USD low-value charge
-- 13 MANUAL_REVIEW: high-value USD with same reference
-- 14 INELIGIBLE: original REVERSED
-- All pairs are deterministic and do not overlap identifiers with prior seed.
;WITH digit AS (
    SELECT d FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) n(d)
), customer_numbers AS (
    SELECT tens.d * 10 + units.d + 1 AS customer_number
    FROM digit tens CROSS JOIN digit units
), pair_numbers AS (
    SELECT tens.d * 10 + units.d + 1 AS pair_number
    FROM (SELECT d FROM digit WHERE d < 5) tens CROSS JOIN digit units
), side_numbers AS (
    SELECT side_number FROM (VALUES (1),(2)) sides(side_number)
), pairs AS (
    SELECT c.customer_number, p.pair_number, s.side_number,
           (c.customer_number - 1) * 50 + p.pair_number AS pair_index,
           ((p.pair_number - 1) % 15) AS scenario
 FROM customer_numbers c CROSS JOIN pair_numbers p CROSS JOIN side_numbers s
     ), attrs AS (
 SELECT p.*,
     DATEADD(MINUTE, (p.pair_number % 12) * 20,
     DATEADD(DAY, -(p.pair_number % 35), @anchor)) AS base_time,
     CONCAT('POC-', RIGHT(CONCAT('000000', p.pair_index),6)) AS pair_ref
 FROM pairs p
     )
 INSERT INTO ${businessSchemaName}.card_transaction
 (transaction_id, customer_id, card_last4, merchant_name,
  merchant_normalized, reference, amount, currency, posted_at, occurred_at, status)
SELECT
    CONVERT(uniqueidentifier, CONCAT('d0020000-0000-4000-8000-',
        RIGHT(CONCAT('000000000000', a.pair_index * 10 + a.side_number),12))),
    CONVERT(uniqueidentifier, CONCAT('c0010000-0000-4000-8000-',
        RIGHT(CONCAT('000000000000', a.customer_number),12))),
    RIGHT(CONCAT('0000', 1000 + a.customer_number), 4),
    CASE
    WHEN a.scenario = 6 AND a.side_number = 2 THEN N'FUEL STOP NORTH'
    WHEN a.scenario = 7 AND a.side_number = 2 THEN N'BOOK STORE CENTRAL'
    WHEN a.scenario = 6 THEN N'FUEL STOP'
    WHEN a.scenario = 7 THEN N'COFFEE HOUSE'
    ELSE CONCAT(N'POC MERCHANT ', RIGHT(CONCAT('000', a.pair_number),3))
END,
    CASE
        WHEN a.scenario = 6 AND a.side_number = 2 THEN N'FUEL STOP NORTH'
        WHEN a.scenario = 7 AND a.side_number = 2 THEN N'BOOK STORE CENTRAL'
        WHEN a.scenario = 6 THEN N'FUEL STOP'
        WHEN a.scenario = 7 THEN N'COFFEE HOUSE'
        ELSE CONCAT(N'POC MERCHANT ', RIGHT(CONCAT('000', a.pair_number),3))
END,
    CASE WHEN a.scenario IN (4,5,13) THEN a.pair_ref
         ELSE CONCAT(a.pair_ref, '-', a.side_number) END,
    CONVERT(decimal(19,4), CASE
       WHEN a.scenario IN (2) THEN 3500000.00
       WHEN a.scenario = 13 THEN 800.00
       WHEN a.scenario = 12 THEN 15.99
       WHEN a.scenario = 9 AND a.side_number = 2 THEN 80.00
       WHEN a.scenario = 1 AND a.side_number = 2 THEN 99000.00
       WHEN a.scenario = 5 AND a.side_number = 2 THEN 101000.00
       ELSE 80000.00 END),
    CASE WHEN a.scenario IN (12,13) OR (a.scenario = 9 AND a.side_number = 2)
         THEN 'USD' ELSE 'COP' END,
    CASE WHEN a.scenario = 10 AND a.side_number = 1 THEN NULL
         ELSE DATEADD(HOUR, 12,
             CASE WHEN a.scenario = 11 AND a.side_number = 1
                  THEN DATEADD(DAY, -90, a.base_time)
                  WHEN a.side_number = 2 AND a.scenario = 8 THEN DATEADD(HOUR, 30, a.base_time)
                  WHEN a.side_number = 2 AND a.scenario = 3 THEN DATEADD(HOUR, 3, a.base_time)
                  WHEN a.side_number = 2 THEN DATEADD(MINUTE, 10, a.base_time)
                  ELSE a.base_time END) END,
    CASE WHEN a.scenario = 11 AND a.side_number = 1 THEN DATEADD(DAY, -90, a.base_time)
         WHEN a.side_number = 2 AND a.scenario = 8 THEN DATEADD(HOUR, 30, a.base_time)
         WHEN a.side_number = 2 AND a.scenario = 3 THEN DATEADD(HOUR, 3, a.base_time)
         WHEN a.side_number = 2 THEN DATEADD(MINUTE, 10, a.base_time)
         ELSE a.base_time END,
    CASE WHEN a.scenario = 10 AND a.side_number = 1 THEN 'PENDING'
         WHEN a.scenario = 14 AND a.side_number = 1 THEN 'REVERSED'
         ELSE 'POSTED' END
FROM attrs a;

-- Fail the Liquibase migration if generated row counts diverge.
IF (SELECT COUNT(*) FROM ${businessSchemaName}.customer) <> 100
    THROW 51001, 'POC seed expected exactly 100 customers', 1;
IF (SELECT COUNT(*) FROM ${businessSchemaName}.card_transaction) <> 10000
    THROW 51002, 'POC seed expected exactly 10000 transactions', 1;