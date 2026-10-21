-- Synthetic demo data for Increment 1. Dates are relative to the moment the seed runs so the
-- transactions fall inside the 60-day synthetic dispute window.
--
-- Scenarios (customer 01 unless noted):
--   Cafe Aroma       2 x 35,000 COP, 10 min apart, same merchant      -> SUPPORTED
--   Fuel Stop        2 x 120,000 COP, similar but different merchant -> MANUAL_REVIEW (ambiguous merchant)
--   Electro Hogar    2 x 3,500,000 COP, 5 min apart                   -> MANUAL_REVIEW (high value)
--   Book Store       80,000 vs 95,000 COP                             -> NOT_SUPPORTED (amount differs)
--   Streaming Plus   2 x 15.99 USD, 3 hours apart                     -> MANUAL_REVIEW (outside 1h window)
--   Grocery Mart     PENDING transaction                              -> 422 not eligible
--   Old Cinema       posted 90 days ago                               -> 422 window expired
--   Pizza Palace     customer 02 duplicate                            -> ownership checks
--
-- Same processor reference on two different transactions (confirmed duplicate rule):
--   Mercado Central  same reference, all values equal                 -> SUPPORTED
--   Tecno Mundo      same reference, all values equal, high value     -> MANUAL_REVIEW (probable duplicate)
--   Hotel Andes      same reference, but 320 vs 230 USD               -> MANUAL_REVIEW (contradictory data)
--   Parqueadero 93   customer 02, same reference, all values equal    -> SUPPORTED

DECLARE @base DATETIME2(3) = DATEADD(DAY, -3, CAST(CAST(SYSUTCDATETIME() AS DATE) AS DATETIME2(3)));

INSERT INTO ${businessSchemaName}.customer (customer_id, display_name, email, active)
VALUES ('11111111-1111-1111-1111-000000000001', N'Demo Customer 01', N'customer01@example.test', 1),
       ('11111111-1111-1111-1111-000000000002', N'Demo Customer 02', N'customer02@example.test', 1);

INSERT INTO ${businessSchemaName}.card_transaction
    (transaction_id, customer_id, card_last4, merchant_name, merchant_normalized, reference,
     amount, currency, posted_at, occurred_at, status)
VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-000000000001', '4821',
     N'CAFE AROMA BOGOTA 001', N'CAFE AROMA', N'SYN-0001',
     35000.0000, 'COP', DATEADD(HOUR, 30, @base), DATEADD(HOUR, 9, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-000000000001', '4821',
     N'CAFE AROMA BOGOTA 001', N'CAFE AROMA', N'SYN-0002',
     35000.0000, 'COP', DATEADD(HOUR, 30, @base), DATEADD(MINUTE, 550, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-000000000001', '4821',
     N'FUEL STOP 24H', N'FUEL STOP', N'SYN-0003',
     120000.0000, 'COP', DATEADD(HOUR, -20, @base), DATEADD(HOUR, -44, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-000000000001', '4821',
     N'FUELSTOP NORTE', N'FUEL STOP NORTE', N'SYN-0004',
     120000.0000, 'COP', DATEADD(HOUR, -20, @base), DATEADD(MINUTE, -2620, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-1111-1111-1111-000000000001', '4821',
     N'ELECTRO HOGAR CENTRO', N'ELECTRO HOGAR', N'SYN-0005',
     3500000.0000, 'COP', DATEADD(HOUR, 6, @base), DATEADD(HOUR, -12, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000006', '11111111-1111-1111-1111-000000000001', '4821',
     N'ELECTRO HOGAR CENTRO', N'ELECTRO HOGAR', N'SYN-0006',
     3500000.0000, 'COP', DATEADD(HOUR, 6, @base), DATEADD(MINUTE, -715, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000007', '11111111-1111-1111-1111-000000000001', '4821',
     N'BOOK STORE ANDINO', N'BOOK STORE', N'SYN-0007',
     80000.0000, 'COP', DATEADD(HOUR, 48, @base), DATEADD(HOUR, 20, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000008', '11111111-1111-1111-1111-000000000001', '4821',
     N'BOOK STORE ANDINO', N'BOOK STORE', N'SYN-0008',
     95000.0000, 'COP', DATEADD(HOUR, 48, @base), DATEADD(MINUTE, 1210, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000009', '11111111-1111-1111-1111-000000000001', '4821',
     N'STREAMING PLUS', N'STREAMING PLUS', N'SYN-0009',
     15.9900, 'USD', DATEADD(HOUR, 50, @base), DATEADD(HOUR, 26, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000010', '11111111-1111-1111-1111-000000000001', '4821',
     N'STREAMING PLUS', N'STREAMING PLUS', N'SYN-0010',
     15.9900, 'USD', DATEADD(HOUR, 50, @base), DATEADD(HOUR, 29, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000011', '11111111-1111-1111-1111-000000000001', '4821',
     N'GROCERY MART', N'GROCERY MART', N'SYN-0011',
     54000.0000, 'COP', NULL, DATEADD(HOUR, 60, @base), 'PENDING'),

    ('aaaaaaaa-0000-0000-0000-000000000012', '11111111-1111-1111-1111-000000000001', '4821',
     N'OLD CINEMA', N'OLD CINEMA', N'SYN-0012',
     28000.0000, 'COP', DATEADD(DAY, -87, @base), DATEADD(DAY, -88, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000013', '11111111-1111-1111-1111-000000000001', '4821',
     N'MERCADO CENTRAL CHAPINERO', N'MERCADO CENTRAL', N'SYN-REF-0013',
     87500.0000, 'COP', DATEADD(HOUR, 40, @base), DATEADD(HOUR, 15, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000014', '11111111-1111-1111-1111-000000000001', '4821',
     N'MERCADO CENTRAL CHAPINERO', N'MERCADO CENTRAL', N'SYN-REF-0013',
     87500.0000, 'COP', DATEADD(HOUR, 40, @base), DATEADD(HOUR, 15, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000015', '11111111-1111-1111-1111-000000000001', '4821',
     N'TECNO MUNDO ANDINO', N'TECNO MUNDO', N'SYN-REF-0015',
     4800000.0000, 'COP', DATEADD(HOUR, 20, @base), DATEADD(HOUR, -2, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000016', '11111111-1111-1111-1111-000000000001', '4821',
     N'TECNO MUNDO ANDINO', N'TECNO MUNDO', N'SYN-REF-0015',
     4800000.0000, 'COP', DATEADD(HOUR, 20, @base), DATEADD(HOUR, -2, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000017', '11111111-1111-1111-1111-000000000001', '4821',
     N'HOTEL ANDES', N'HOTEL ANDES', N'SYN-REF-0017',
     320.0000, 'USD', DATEADD(HOUR, 52, @base), DATEADD(HOUR, 31, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000018', '11111111-1111-1111-1111-000000000001', '4821',
     N'HOTEL ANDES', N'HOTEL ANDES', N'SYN-REF-0017',
     230.0000, 'USD', DATEADD(HOUR, 52, @base), DATEADD(HOUR, 31, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000021', '11111111-1111-1111-1111-000000000002', '1907',
     N'PIZZA PALACE', N'PIZZA PALACE', N'SYN-0021',
     42000.0000, 'COP', DATEADD(HOUR, 30, @base), DATEADD(HOUR, 10, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000022', '11111111-1111-1111-1111-000000000002', '1907',
     N'PIZZA PALACE', N'PIZZA PALACE', N'SYN-0022',
     42000.0000, 'COP', DATEADD(HOUR, 30, @base), DATEADD(MINUTE, 615, @base), 'POSTED'),

    ('aaaaaaaa-0000-0000-0000-000000000023', '11111111-1111-1111-1111-000000000002', '1907',
     N'PARQUEADERO CALLE 93', N'PARQUEADERO CALLE 93', N'SYN-REF-0023',
     12000.0000, 'COP', DATEADD(HOUR, 28, @base), DATEADD(HOUR, 8, @base), 'POSTED'),
    ('aaaaaaaa-0000-0000-0000-000000000024', '11111111-1111-1111-1111-000000000002', '1907',
     N'PARQUEADERO CALLE 93', N'PARQUEADERO CALLE 93', N'SYN-REF-0023',
     12000.0000, 'COP', DATEADD(HOUR, 28, @base), DATEADD(HOUR, 8, @base), 'POSTED');
