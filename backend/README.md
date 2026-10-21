# Card Dispute backend

Spring Boot 3.5 modular monolith (Java 17) with embedded Camunda 7 and SQL Server.

## Increment 1 (BE-1): transactions, disputes and matching rules

### Demo users (HTTP Basic, synthetic)

| User         | Password | Role              | Customer id                            |
|--------------|----------|-------------------|----------------------------------------|
| `customer01` | `demo`   | `CUSTOMER`        | `11111111-1111-1111-1111-000000000001` |
| `customer02` | `demo`   | `CUSTOMER`        | `11111111-1111-1111-1111-000000000002` |
| `analyst01`  | `demo`   | `DISPUTE_ANALYST` | -                                      |

Configured in `application.security.demo-users` (`DEMO_USER_PASSWORD` overrides the password).
401/403 responses are Problem Details without `WWW-Authenticate`, so the SPA does not get the browser login popup.

### Endpoints

| Method | Path                             | Role               | Notes                                                    |
|--------|----------------------------------|--------------------|----------------------------------------------------------|
| GET    | `/api/v1/transactions?status=`   | CUSTOMER           | Own transactions, paged (`page`, `size`, `sort`)         |
| GET    | `/api/v1/transactions/{id}`      | CUSTOMER           | 404 if not owned                                         |
| POST   | `/api/v1/disputes`               | CUSTOMER           | 201 / 400 / 404 / 409 / 422                              |
| GET    | `/api/v1/disputes?status=`       | CUSTOMER, ANALYST  | Customers see their own cases, analysts see all          |
| GET    | `/api/v1/disputes/{id}`          | CUSTOMER, ANALYST  | Case, both transactions, decision (null while open)      |

Errors use `application/problem+json` with `errorCode` and `correlationId`
(`TRANSACTION_NOT_FOUND`, `TRANSACTION_NOT_POSTED`, `DISPUTE_WINDOW_EXPIRED`, `INVALID_CANDIDATE`,
`OPEN_DISPUTE_EXISTS`, `VALIDATION_FAILED`, ...). Send `X-Correlation-Id` to trace a request; it is echoed back.

```bash
curl -u customer01:demo -H "Content-Type: application/json" -d '{"transactionId":"aaaaaaaa-0000-0000-0000-000000000001","candidateTransactionId":"aaaaaaaa-0000-0000-0000-000000000002","reasonCode":"POSSIBLE_DUPLICATE"}' http://localhost:8080/api/v1/disputes
```

### Postman

Import [`postman/card-dispute-api.postman_collection.json`](postman/card-dispute-api.postman_collection.json)
and the environment [`postman/card-dispute-local.postman_environment.json`](postman/card-dispute-local.postman_environment.json).
Folders cover auth checks, transactions, every seeded submit scenario, submit errors (400/404/409/422/403),
customer queries and analyst queries; each request has test assertions. Run the folders in order on a fresh
seed (re-submitting returns 409 while the disputes are still open).

### Design choices for the kickoff questions

- **Invalid submissions** are rejected with an HTTP error and no dispute is recorded (`REJECTED_INELIGIBLE` is reserved).
- **Duplicate candidate** is required: the customer always sends both transactions (`transactionId` and
  `candidateTransactionId`); the system does not search for duplicates. The candidate must be another
  transaction of the same customer (`INVALID_CANDIDATE` otherwise; also enforced by `NOT NULL` and a `CHECK`).
- **One open dispute per transaction** is enforced by the filtered unique index `UX_dispute_case_active_transaction`;
  a Java precheck also blocks disputing a transaction already used as the candidate of an open case.

### Matching rules (`application.dispute.rules`, synthetic)

`DuplicateMatchingService` returns `SUPPORTED`, `NOT_SUPPORTED` or `MANUAL_REVIEW`:

1. Candidate not `POSTED` -> `NOT_SUPPORTED`.
2. **Same `reference`** (trimmed, case-insensitive) on both transactions:
   - same merchant, amount and currency -> `SUPPORTED` (confirmed duplicate, the time between charges is irrelevant);
   - same data but above the high-value threshold -> `MANUAL_REVIEW` (probable duplicate, analyst confirms);
   - merchant, amount or currency differ -> `MANUAL_REVIEW` (contradictory data).
3. Different amount/currency, unrelated merchant or more than 24 h apart -> `NOT_SUPPORTED`.
4. Amount above the per-currency high-value threshold -> `MANUAL_REVIEW`.
5. Similar but not identical normalized merchant -> `MANUAL_REVIEW`.
6. Same merchant but more than 1 h apart -> `MANUAL_REVIEW`.
7. Otherwise -> `SUPPORTED`.

`reference` is also returned in `TransactionResponse`.

### Workflow hand-off (BE-2)

Starting the Camunda process and storing `workflow_instance_id` are owned by BE-2 and not part of this
increment. `DisputeLifecycleService` provides the business steps the thin BPMN delegates should call:
`markInReview` -> `assess` (returns the gateway outcome) -> `resolveAutomatically` or `markAwaitingAnalyst`.

Until that is wired, submitted disputes stay `SUBMITTED`.

### Demo seed (Liquibase context `demo-seed`)

Dates are relative to when the seed runs. Customer 01 scenarios:

| Transaction ids (`aaaaaaaa-0000-0000-0000-0000000000NN`) | Scenario                          | Expected outcome |
|-----------------------------------------------------------|-----------------------------------|------------------|
| 01 / 02                                                   | Cafe Aroma, 10 min apart          | SUPPORTED        |
| 03 / 04                                                   | Fuel Stop vs Fuelstop Norte       | MANUAL_REVIEW    |
| 05 / 06                                                   | Electro Hogar 3,500,000 COP       | MANUAL_REVIEW    |
| 07 / 08                                                   | Book Store, different amounts     | NOT_SUPPORTED    |
| 09 / 10                                                   | Streaming Plus USD, 3 h apart     | MANUAL_REVIEW    |
| 11                                                        | Pending transaction               | 422              |
| 12                                                        | Posted 90 days ago                | 422              |
| 13 / 14                                                   | Mercado Central, same reference   | SUPPORTED        |
| 15 / 16                                                   | Tecno Mundo, same reference, high value | MANUAL_REVIEW |
| 17 / 18                                                   | Hotel Andes, same reference, 320 vs 230 USD | MANUAL_REVIEW |
| 21 / 22                                                   | Customer 02 (ownership checks)    | SUPPORTED        |
| 23 / 24                                                   | Customer 02, same reference       | SUPPORTED        |

Set `CARD_DISPUTE_LIQUIBASE_CONTEXTS=db-init` to skip the seed.
