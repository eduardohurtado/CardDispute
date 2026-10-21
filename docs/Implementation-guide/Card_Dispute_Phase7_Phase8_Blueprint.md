# Card Dispute POC — Phase 7 Detailed Technical Design & Phase 8 Implementation Plan

**Status:** Implementation-ready proposal for team review (not production architecture).  
**Business case:** Customer-Initiated Duplicate Card Transaction Dispute.  
**Primary purpose:** Team-owned stack learning initiative; no formal client requirement.  
**Agreed constraints:** Synthetic data only; no actual refunds, chargebacks, bank integrations, or regulatory case management.

## 0. Baseline and intentional design choices

- Java 17, Spring Boot 3.5.x, Camunda 7.24 Community Edition embedded, SQL Server 2022, RabbitMQ, React/TypeScript, ELK, Docker Compose, GitHub Actions.
- Frontend (already bootstrapped in `frontend/`, see `frontend/README.md`): React 19 + TypeScript 5 (strict), Vite 8, Tailwind CSS v4, React Router v7 (data mode), Redux Toolkit 2 + RTK Query, Vitest + Testing Library. Requires Node.js 22.13+.
- **Node.js has been included** as a small RabbitMQ consumer for mock notifications because the team explicitly wants hands-on practice with the client's stack. It owns no core dispute rules or case state.
- One Java deployable (modular monolith), one React frontend, one small Node worker. Not a microservices-based banking platform.
- Camunda is embedded in Spring Boot; `camunda` BPM tables are managed by Camunda and **not** recreated as JPA entities. Business tables are separated logically in schema `dispute`; for easiest Camunda integration, determine runtime schema/default schema during bootstrap rather than assuming separate Camunda schema configuration is automatic.
- Status is **proposed for team review**. ADR-004 (business versus workflow state) recommended; ADR-007 (minimal outbox) recommended for reliable async demonstration.
- Prior 60-day eligibility and 1-hour duplicate matching windows are **synthetic POC rules**; the high-value amount threshold for review is a proposed configuration, not a real bank policy.

## 7.1 Domain design and business workflow

### Actors

- `CUSTOMER`: accesses only owned transactions and disputes.
- `DISPUTE_ANALYST`: reviews eligible analyst tasks, decides with mandatory rationale.
- `SYSTEM`: applies business rules and produces async mock notification events.

### State machine

```
SUBMITTED -> IN_REVIEW -> RESOLVED_DUPLICATE_SUPPORTED
                      \-> RESOLVED_NOT_SUPPORTED
                      \-> AWAITING_ANALYST -> RESOLVED_DUPLICATE_SUPPORTED
                                           \-> RESOLVED_NOT_SUPPORTED
                                           \-> TIMEOUT_REVIEW_REQUIRED
SUBMITTED -> REJECTED_INELIGIBLE  (only if a recorded invalid-case workflow is used)
```

Validation failures that prevent case creation (invalid payload, wrong owner, existing open case) produce HTTP errors and **no new dispute**. `REJECTED_INELIGIBLE` is reserved for a recorded case that fails eligibility after accepted submission; choose one consistent policy in the team design review.

`TIMEOUT_REVIEW_REQUIRED` is an **exception state, not a final banking verdict**. An analyst may subsequently process a reopened/reassigned review; for MVP it can remain flagged with no automatic financial resolution.

### Business invariants and simplified rules

1. A customer may act only on their synthetic transactions.
2. Only `POSTED` purchases are eligible.
3. Submission within 60 calendar days of posting (synthetic window).
4. At most one open dispute for a given transaction. Enforce with DB constraint/index or an equivalent atomic persistence mechanism, not a Java-only precheck.
5. Same amount and currency required for clear duplicate classification.
6. Same normalized merchant + timestamp distance <= 1 hours + no contradiction = strong duplicate match.
7. Ambiguous merchant match or proposed high-value flag = analyst review.
8. Analyst decision requires a reason.
9. Review due after two _simulated business days_; use shortened demo timer, with the distinction documented.
10. Terminal banking decisions are immutable through normal API actions; record explicit transitions and audit entries.

**Business ownership:** Dispute module owns business status and final decision; Camunda owns execution/user-task/timer state. Workflow history is not the banking audit record.

### Camunda BPMN model — conceptual executable specification

```
START (dispute accepted)
  -> Service Task: Mark IN_REVIEW
  -> Service Task: Assess synthetic transactions (JavaDelegate -> application service)
  -> Exclusive Gateway: assessmentOutcome
      SUPPORTED -> Service Task: Resolve supported ----\
      NOT_SUPPORTED -> Service Task: Resolve not supported -> Join/logical finish
      MANUAL_REVIEW -> Service Task: Mark AWAITING_ANALYST
                       -> User Task: Analyst reviews dispute
                           | completed -> Service Task: Persist analyst resolution --/
                           | interrupting boundary timer -> Service Task: Mark TIMEOUT_REVIEW_REQUIRED -> END (exception)
  -> Service Task: Save notification intent (within resolution transaction)
  -> END (resolved)
```

Gateway expressions reference **precomputed simple outcomes** (`SUPPORTED`, `NOT_SUPPORTED`, `MANUAL_REVIEW`); complex merchant/eligibility rules stay in Java business services. A timer uses a short test duration in demo configuration, not an actual two-day wait. A failed technical service task produces visible incident/retry behavior; it must not be interpreted as a business rejection.

**Important Camunda transaction design:** Use synchronous service delegates with Spring-managed services; explicitly test expected transaction manager boundaries for JPA + Camunda before assuming atomic commit. An exception should roll back a business transition if in the same transaction; test via integration test.

**Process variables** (keep minimal): `disputeId`, `assessmentOutcome`, `reviewRequired`, `analystDecision` (if any), `reviewReason` (if any), `correlationId`. Do not place complete cardholder records in workflow variables.

## 7.2 Relational design (SQL Server)

**Principles:** `dispute` business schema; Camunda-owned BPM tables independently managed. Use `BIGINT IDENTITY` internal PKs or UUID/ULID consistently; proposed below: `UNIQUEIDENTIFIER` UUID keys for public/business objects, `BIGINT IDENTITY` for histories/outbox. `DATETIME2(3)` in UTC. Monetary amounts `DECIMAL(19,4)` with `CHAR(3)` ISO currency. Collation/precision to be confirmed. Masked display tokens only; **no PAN/CVV**.

### `dispute.customer`

| Column         | Type             | Null | Constraint / meaning       |
| -------------- | ---------------- | ---- | -------------------------- |
| `customer_id`  | UNIQUEIDENTIFIER | NO   | PK                         |
| `display_name` | NVARCHAR(120)    | NO   | Synthetic name             |
| `email`        | NVARCHAR(254)    | NO   | Synthetic mock destination |
| `active`       | BIT              | NO   | default 1                  |
| `created_at`   | DATETIME2(3)     | NO   | UTC                        |

### `dispute.card_transaction`

| Column                | Type             | Null | Constraint / meaning          |
| --------------------- | ---------------- | ---- | ----------------------------- |
| `transaction_id`      | UNIQUEIDENTIFIER | NO   | PK                            |
| `customer_id`         | UNIQUEIDENTIFIER | NO   | FK customer                   |
| `card_last4`          | CHAR(4)          | NO   | Synthetic masked display only |
| `merchant_name`       | NVARCHAR(160)    | NO   | Original synthetic descriptor |
| `merchant_normalized` | NVARCHAR(160)    | NO   | Evaluated descriptor          |
| `amount`              | DECIMAL(19,4)    | NO   | CHECK amount > 0              |
| `currency`            | CHAR(3)          | NO   | e.g. COP/USD                  |
| `posted_at`           | DATETIME2(3)     | YES  | Eligible only if POSTED       |
| `occurred_at`         | DATETIME2(3)     | NO   | UTC                           |
| `status`              | VARCHAR(16)      | NO   | `POSTED`,`PENDING`,`REVERSED` |
| `created_at`          | DATETIME2(3)     | NO   | UTC                           |

Indexes: `(customer_id, posted_at DESC)` for customer views; `(merchant_normalized, amount, currency, occurred_at)` for synthetic matching queries; status index only if measured need.

### `dispute.dispute_case`

| Column                     | Type             | Null | Constraint / meaning                        |
| -------------------------- | ---------------- | ---- | ------------------------------------------- |
| `dispute_id`               | UNIQUEIDENTIFIER | NO   | PK; Camunda business key string             |
| `customer_id`              | UNIQUEIDENTIFIER | NO   | FK customer                                 |
| `transaction_id`           | UNIQUEIDENTIFIER | NO   | FK card_transaction                         |
| `candidate_transaction_id` | UNIQUEIDENTIFIER | YES  | FK card_transaction; suspected duplicate    |
| `reason_code`              | VARCHAR(32)      | NO   | `POSSIBLE_DUPLICATE` for POC                |
| `description`              | NVARCHAR(500)    | YES  | Synthetic user note                         |
| `status`                   | VARCHAR(40)      | NO   | State machine value                         |
| `assessment_outcome`       | VARCHAR(24)      | YES  | `SUPPORTED`,`NOT_SUPPORTED`,`MANUAL_REVIEW` |
| `workflow_instance_id`     | VARCHAR(64)      | YES  | Camunda instance ID                         |
| `created_at`               | DATETIME2(3)     | NO   | UTC                                         |
| `updated_at`               | DATETIME2(3)     | NO   | UTC                                         |
| `resolved_at`              | DATETIME2(3)     | YES  | UTC                                         |
| `version`                  | BIGINT           | NO   | optimistic locking                          |

Indexes: `(customer_id, created_at DESC)`, `(status, created_at)`, unique filtered index on `transaction_id` for active statuses (`SUBMITTED`,`IN_REVIEW`,`AWAITING_ANALYST`,`TIMEOUT_REVIEW_REQUIRED`). SQL Server filtered index uses a fixed status list; ensure it matches approved state semantics. Add uniqueness to prevent dispute for the same pair where necessary; **do not rely solely on an application precheck**.

### `dispute.dispute_decision`

| Column            | Type             | Null | Constraint / meaning                        |
| ----------------- | ---------------- | ---- | ------------------------------------------- |
| `decision_id`     | UNIQUEIDENTIFIER | NO   | PK                                          |
| `dispute_id`      | UNIQUEIDENTIFIER | NO   | FK + UNIQUE (one final decision)            |
| `decision_type`   | VARCHAR(32)      | NO   | `DUPLICATE_SUPPORTED`,`NOT_SUPPORTED`       |
| `decision_source` | VARCHAR(16)      | NO   | `AUTOMATED`,`ANALYST`                       |
| `rationale`       | NVARCHAR(1000)   | NO   | Mandatory, including automation explanation |
| `decided_by`      | NVARCHAR(80)     | NO   | actor ID or `SYSTEM`                        |
| `decided_at`      | DATETIME2(3)     | NO   | UTC                                         |

### `dispute.dispute_audit_event`

| Column           | Type             | Null | Constraint / meaning                        |
| ---------------- | ---------------- | ---- | ------------------------------------------- |
| `audit_id`       | BIGINT IDENTITY  | NO   | PK                                          |
| `dispute_id`     | UNIQUEIDENTIFIER | NO   | FK                                          |
| `event_type`     | VARCHAR(60)      | NO   | `CREATED`, `STATE_CHANGED`, `DECIDED`, etc. |
| `old_status`     | VARCHAR(40)      | YES  | Previous state                              |
| `new_status`     | VARCHAR(40)      | YES  | Current state                               |
| `actor_id`       | NVARCHAR(80)     | NO   | Synthetic principal or SYSTEM               |
| `correlation_id` | VARCHAR(64)      | NO   | trace                                       |
| `details`        | NVARCHAR(1000)   | YES  | non-sensitive explanation                   |
| `occurred_at`    | DATETIME2(3)     | NO   | UTC                                         |

Index: `(dispute_id, occurred_at)`.

### `dispute.notification_outbox`

| Column            | Type             | Null | Constraint / meaning                      |
| ----------------- | ---------------- | ---- | ----------------------------------------- |
| `outbox_id`       | UNIQUEIDENTIFIER | NO   | PK = eventId                              |
| `dispute_id`      | UNIQUEIDENTIFIER | NO   | FK                                        |
| `event_type`      | VARCHAR(40)      | NO   | `DISPUTE_RESOLVED`                        |
| `payload`         | NVARCHAR(MAX)    | NO   | JSON payload (synthetic identifiers only) |
| `status`          | VARCHAR(16)      | NO   | `PENDING`,`PUBLISHED`, `RETRY`            |
| `attempt_count`   | INT              | NO   | default 0                                 |
| `next_attempt_at` | DATETIME2(3)     | NO   | UTC                                       |
| `published_at`    | DATETIME2(3)     | YES  | On confirmed publication                  |
| `created_at`      | DATETIME2(3)     | NO   | UTC                                       |
| `last_error`      | NVARCHAR(500)    | YES  | Sanitized error                           |

Index `(status, next_attempt_at)`. Created **in the same business transaction** as terminal decision. Background publisher sends with RabbitMQ publisher confirms, then marks `PUBLISHED`; duplicates possible on crash, which is expected and handled by consumer.

### `dispute.notification_delivery`

| Column         | Type             | Null | Constraint / meaning |
| -------------- | ---------------- | ---- | -------------------- |
| `event_id`     | UNIQUEIDENTIFIER | NO   | PK; idempotency key  |
| `dispute_id`   | UNIQUEIDENTIFIER | NO   | reference to case    |
| `channel`      | VARCHAR(12)      | NO   | `MOCK_EMAIL`         |
| `status`       | VARCHAR(20)      | NO   | `DELIVERED`,`FAILED` |
| `processed_at` | DATETIME2(3)     | NO   | UTC                  |
| `provider_ref` | NVARCHAR(80)     | YES  | mock reference       |
| `error_code`   | VARCHAR(60)      | YES  | if failed            |

**Cross-language simplicity option:** Node consumer writes to `notification_delivery` using SQL Server driver, but this couples the worker directly to the database. **Recommended for POC:** Node worker performs synthetic delivery, stores a durable deduplication/receipt via a small backend callback REST endpoint (service credential), and acknowledges the RabbitMQ message only after the callback succeeds. The backend owns all business persistence; callback idempotency is enforced by `event_id` uniqueness. If callback fails, the broker redelivers, while the simulated delivery should be idempotent by eventId too.

**Optional** `dispute.idempotency_request` only if client-supplied Idempotency-Key is used for create calls; otherwise first focus on invariant of one active dispute per transaction + outbox event IDs.

**Seed size suggestion:** 10,000 synthetic customers; 20,000 synthetic transactions; 1,000 preloaded cases; 25 concurrent demo users. Not a 6M-customer load test.

## 7.3 Backend project structure (one Spring Boot application — simple layers by functional module)

The Java backend follows a **modular monolith with a traditional layered structure inside each functional module**. This is **not Clean Architecture or DDD**: do not add `domain/application/infrastructure`, ports/adapters, or service interfaces and `Impl` classes unless a concrete requirement justifies them. Keep a **single Maven artifact and one Spring Boot executable**. Create only folders/classes actually needed.

```text
card-dispute/
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
│       ├── main/
│       │   ├── java/com/techmahindra/carddispute/
│       │   │   ├── CardDisputeApplication.java
│       │   │   ├── config/
│       │   │   │   ├── SecurityConfig.java
│       │   │   │   └── RabbitMQConfig.java
│       │   │   ├── transaction/
│       │   │   │   ├── controller/
│       │   │   │   ├── service/
│       │   │   │   ├── repository/
│       │   │   │   ├── entity/
│       │   │   │   └── dto/
│       │   │   ├── dispute/
│       │   │   │   ├── controller/
│       │   │   │   ├── service/
│       │   │   │   ├── repository/
│       │   │   │   ├── entity/
│       │   │   │   └── dto/
│       │   │   ├── workflow/
│       │   │   │   ├── controller/
│       │   │   │   ├── service/
│       │   │   │   └── delegate/
│       │   │   ├── notification/
│       │   │   │   ├── controller/           # restricted worker receipt callback, if needed
│       │   │   │   ├── service/
│       │   │   │   ├── repository/
│       │   │   │   ├── entity/
│       │   │   │   └── dto/
│       │   │   └── common/
│       │   │       ├── exception/
│       │   │       └── security/
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── static/forms/
│       │       ├── bpmn/card-dispute.bpmn
│       │       └── liquibase/
│       │           └── db/
│       │               ├── db.changelog-master.yaml
│       │               ├── migrations/
│       │               └── sql/
│       └── test/java/com/techmahindra/carddispute/ # tests organized by functional module
├── frontend/
├── notification-worker/
├── infra/                           # Compose and environment templates
├── docs/architecture/adr/
└── .github/workflows/
```

**Module responsibilities:**

- `transaction`: synthetic card transactions, eligibility and duplicate matching.
- `dispute`: dispute lifecycle, business decisions, persistence and business audit records (no separate audit module).
- `workflow`: embedded Camunda interaction, analyst task APIs and thin Java delegates invoking the corresponding services.
- `notification`: outbox persistence, RabbitMQ publishing and the restricted worker receipt callback.
- `config` and `common`: only genuinely shared configuration, exceptions and simplified security; avoid generic abstraction layers.

**Implementation guidelines:** Controllers receive/validate HTTP requests and call services; services own business rules and transaction boundaries; repositories access SQL Server through Spring Data JPA; entities represent persistence; DTOs define API contracts. Modules call one another through ordinary Spring service methods, not internal HTTP. A concrete `DisputeService` is enough; do not create `DisputeServiceImpl` by default. Keep JPA entities out of REST responses. Camunda delegates remain thin; do not duplicate business rules in BPMN. A custom `CamundaConfig` is unnecessary if starter properties suffice. Liquibase manages only business tables; Camunda manages its own engine tables.

## 7.4 Frontend structure (React SPA, not a modular monolith backend)

The frontend skeleton already exists in `frontend/`; `frontend/README.md` is the source of truth for setup, scripts and conventions. It is a single SPA organized **by layer** (`pages/`, `components/`, `store/`, `routes/`), not by feature folder. Files marked _(planned)_ are the screens and APIs this POC still has to add, following the "Adding a feature" steps in the README.

```
frontend/
├── index.html                       # HTML entry; loads src/main.tsx
├── vite.config.ts                   # Vite, Tailwind, @/ alias, Vitest config
├── .env.example                     # VITE_API_URL (default /api)
├── public/                          # static files (favicon, manifest)
└── src/
    ├── main.tsx                     # <Provider store> → <RouterProvider router>
    ├── index.css                    # Tailwind import + base styles
    ├── routes/
    │   ├── paths.ts                 # URL constants (no hard-coded URLs)
    │   ├── routes.tsx               # route tree; pages loaded with `lazy`
    │   └── router.tsx               # createBrowserRouter(routes)
    ├── layouts/
    │   └── RootLayout.tsx           # header, sidebar, <Outlet />, toasts
    ├── pages/
    │   ├── HomePage.tsx
    │   ├── NotFoundPage.tsx
    │   ├── SubmitDisputePage.tsx    # (planned) customer submission
    │   ├── MyDisputesPage.tsx       # (planned) customer tracking list
    │   ├── DisputeDetailPage.tsx    # (planned) status, decision, timeline
    │   ├── AnalystQueuePage.tsx     # (planned) analyst work queue
    │   └── AnalystReviewPage.tsx    # (planned) evidence + decision form
    ├── components/
    │   ├── RouteErrorBoundary.tsx
    │   ├── Toaster.tsx              # toast notifications from uiSlice
    │   └── …                        # (planned) StatusBadge, Timeline, DisputeForm
    ├── store/
    │   ├── store.ts                 # makeStore, combineSlices, RootState/AppDispatch
    │   ├── hooks.ts                 # useAppSelector / useAppDispatch
    │   ├── index.ts                 # public exports (import from "@/store")
    │   ├── api/
    │   │   ├── baseApi.ts           # single RTK Query API (base URL from VITE_API_URL)
    │   │   └── …                    # (planned) transactions, disputes, analyst endpoints
    │   └── slices/
    │       ├── ui/uiSlice.ts        # sidebar + toasts
    │       └── …                    # (planned) session slice: synthetic user + role
    └── test/
        └── renderWithProviders.tsx  # full app with fresh store + memory router
```

**Conventions (from `frontend/README.md`):**

- **Routing:** every route is a child of `RootLayout`; each page is lazy-loaded into its own chunk; `*` shows `NotFoundPage`; route errors show `RouteErrorBoundary`. URLs live in `paths.ts`. Role guards (customer vs analyst) are added at the route level.
- **Server data** (transactions, disputes, analyst tasks) lives only in the **RTK Query** cache. Each area adds endpoints with `baseApi.injectEndpoints(...)` and uses the generated hooks (e.g. `useGetDisputesQuery`, `useCreateDisputeMutation`). Cache tags (e.g. `Dispute`, `AnalystTask`) are declared in `baseApi.tagTypes` so a submit/decision refreshes lists.
- **Client state** (sidebar, toasts, synthetic session/role) lives in **slices** registered in `combineSlices(...)`. Always use the typed hooks from `@/store`.
- **Styling:** Tailwind utility classes in `className`; full class names only (map status → class, as `Toaster.tsx` does for variants). No separate design system.
- **API base URL:** `VITE_API_URL` defaults to `/api`. The backend contract uses `/api/v1` (§7.5), so either set `VITE_API_URL=/api/v1` or prefix endpoint paths with `v1/`; pick one in Increment 0.
- **Tests:** Vitest + Testing Library + jsdom; test files sit next to the code (`*.test.tsx`); `renderWithProviders({ route, preloadedState })` for page tests; slices tested directly against `makeStore()`.

Three user-visible areas are enough: customer submission, customer tracking, analyst workspace (subpages as needed). This layer-based layout mirrors domain terms in page/endpoint names but does not impose the backend modular-monolith pattern on React.

### Node worker structure

```
notification-worker/
├── package.json
├── src/
│   ├── index.ts                           # startup and shutdown
│   ├── messaging/consumer.ts             # RabbitMQ consume/ack
│   ├── notifications/mockSender.ts       # simulated send (idempotent)
│   ├── integrations/receiptClient.ts     # backend callback
│   ├── contracts/disputeResolved.ts      # versioned event contract
│   ├── logging/logger.ts                 # structured logs
│   └── config.ts
└── tests/
```

## 7.5 REST API contract inventory

Base path `/api/v1`. Use JSON; request/response DTOs, Problem Details errors (`application/problem+json`), UUID identifiers, UTC timestamps. A synthetic login/session or local demo user selector is allowed only if server-side authorization enforces identity. Internal callback uses a separate restricted service identity (no publicly writable receipt endpoint).

| Method | Path                                      | Owner module        | Purpose                                                       | Typical response |
| ------ | ----------------------------------------- | ------------------- | ------------------------------------------------------------- | ---------------- |
| GET    | `/api/v1/transactions?status=POSTED`      | Transactions        | List owned, synthetic posted transactions                     | 200 paged        |
| GET    | `/api/v1/transactions/{id}`               | Transactions        | Details of an owned synthetic transaction                     | 200 / 404        |
| POST   | `/api/v1/disputes`                        | Disputes            | Submit dispute; validate ownership/eligibility; start Camunda | 201 / 409 / 422  |
| GET    | `/api/v1/disputes`                        | Disputes            | List customer's cases, filters, pagination                    | 200              |
| GET    | `/api/v1/disputes/{id}`                   | Disputes            | Return authorized case, status and decision                   | 200 / 404        |
| GET    | `/api/v1/disputes/{id}/timeline`          | Audit               | Business audit timeline                                       | 200              |
| GET    | `/api/v1/analyst/tasks`                   | Workflow            | Analyst work queue (authorized)                               | 200              |
| GET    | `/api/v1/analyst/tasks/{taskId}`          | Workflow            | Context needed to assess a task                               | 200 / 404        |
| POST   | `/api/v1/analyst/tasks/{taskId}/decision` | Workflow + Disputes | Save reasoned analyst decision and complete Camunda task      | 200 / 409 / 422  |
| POST   | `/internal/v1/notification-receipts`      | Notifications       | Node worker submits idempotent delivery receipt; restricted   | 200/201          |
| GET    | `/actuator/health`                        | Shared              | Basic service health, local only                              | 200 / 503        |

**Creation request (minimal):** `{ transactionId, candidateTransactionId?, reasonCode: "POSSIBLE_DUPLICATE", description? }`. Principal `customerId` must come from authenticated synthetic principal, **not** be trusted from request body. Frontend can derive candidate from choices or system can auto-identify candidate; choose one UX and keep REST contract stable.

**Decision request:** `{ decision: "DUPLICATE_SUPPORTED" | "NOT_SUPPORTED", rationale: "..." }`; actor comes from authenticated analyst. Reject stale/completed task with `409`.

**Errors:** `400` malformed, `401` unauthenticated, `403` unauthorized, `404` not found (including inaccessible cases if privacy policy), `409` duplicate/concurrent conflict, `422` invalid business eligibility, `500/503` transient technical failures. Avoid `200` for business failures.

**Notification event contract v1:** `{ eventId, eventType:"DISPUTE_RESOLVED", occurredAt, disputeId, customerId, outcome, correlationId }` (no PAN or sensitive text). Node mock sender logs simulated delivery only; no real email/SMS.

## 7.6 User interface wireframes (text mockups)

### Customer — Submit Dispute

```
+--------------------------------------------------------------+
| Card Dispute   [Customer: Demo Customer 01]  [My Disputes]    |
+--------------------------------------------------------------+
| Report a possible duplicate card charge                      |
| Transaction [ Coffee Shop · COP 35,000 · 09/10 ] [Select v]   |
| Possible duplicate [ Coffee Shop · COP 35,000 ] [Select v]    |
| Reason [ Possible duplicate charge v ]                      |
| Additional details [___________________________________]      |
| [Submit Dispute]                                             |
| Notice: Demonstration only; no actual refunds.              |
+--------------------------------------------------------------+
```

### Customer — My Disputes / Detail

```
+--------------------------------------------------------------+
| My Disputes  [Status filter v]                                |
| DSP-101 | Coffee Shop | AWAITING_ANALYST | [View]            |
| DSP-102 | Fuel Stop   | RESOLVED_NOT_SUPPORTED | [View]      |
+--------------------------------------------------------------+
| Case DSP-101                                                  |
| Transaction / suspected duplicate                            |
| Status timeline: Submitted -> Validated -> Analyst review    |
| Decision: Pending                                            |
| Notification: Not applicable until resolution                 |
+--------------------------------------------------------------+
```

### Analyst — Work Queue & Review

```
+--------------------------------------------------------------+
| Analyst Workspace  [Pending tasks 4] [Due Soon]              |
| Case     Amount    Merchant       Submitted       [Review]  |
| DSP-101  35,000    Coffee Shop    14-Oct          [Review]  |
+--------------------------------------------------------------+
| Case evidence: two synthetic transactions + assessment       |
| Match assessment: AMBIGUOUS                                  |
| Decision: ( ) Support duplicate  ( ) Not supported          |
| Rationale [_____________________________________________]    |
| [Submit Decision]                                            |
+--------------------------------------------------------------+
```

Frontend details: loading/empty/error states (from RTK Query `isLoading` / `isError`), form validation, status badges, a short read-only history, and clear messages for 409 conflict and session role. Success and error feedback (e.g. "Dispute submitted", "Task already completed") uses the existing toast system (`showToast` in `uiSlice` + `Toaster`). Screens are styled with Tailwind; no design system or elaborate dashboards needed.

## 7.7 Messaging, security, observability, tests

**RabbitMQ:** one topic/direct exchange `card-dispute.events`, routing key `dispute.resolved.v1`, durable main queue `card-dispute.notifications`, dead-letter queue `card-dispute.notifications.dlq`; do not require Kafka. Delivery policy: manual ack after mock delivery and callback, retry limited to 3 attempts with progressive delay, DLQ after exhaustion. Define an explicit durable retry implementation during coding (Rabbit delayed-message plugin is NOT assumed). Publisher confirms before outbox `PUBLISHED` marker. Consumer dedup by `eventId` through backend receipt uniqueness. Both backend and Node worker log `eventId`, `disputeId`, and `correlationId`.

**Security:** synthetic users and roles (`CUSTOMER`, `DISPUTE_ANALYST`), backend ownership checks, internal worker credential for callback. No real banking data. Disable public access to Camunda admin and management endpoints. Local-only deployment.

**Observability:** JSON logging from Java and Node with `timestamp`, `level`, `service`, `correlationId`, `disputeId`, `event`, `errorCode`; logs sent to ELK; Kibana saved queries: dispute lifecycle, workflow errors, pending/retried notifications. No payment PAN/CVV, no full card data.

**Test layers:** JUnit for matching rules, Spring integration tests for DB/engine including rollback, contract tests REST, RabbitMQ consumer retry/idempotency tests, React component/form and slice tests (Vitest + Testing Library, using `renderWithProviders`), one browser E2E test. Smoke with 25 concurrent users; measure errors and p95 without claiming production SLA.

## 8. Implementation planning — team of five

**Roles:** FE-1 (customer flows), FE-2 (analyst flows), FS (contracts + Node/Rabbit + CI), BE-1 (domain/persistence/API), BE-2 (Camunda/integration/architecture and backend). Everyone owns unit tests for delivered code. Pair review at module boundaries.

### Increment 0 — Foundations (first cross-team milestone)

- BE-2: Create monorepo conventions, Java Spring Boot skeleton with embedded Camunda startup and SQL Server connection, initial ADR notes.
- BE-1: Liquibase baseline, synthetic fixture plan, skeleton domain module and first migration.
- FS: Docker Compose for SQL Server, RabbitMQ, backend, Node, React; CI pipeline skeleton; agree API request/response examples.
- FE-1/FE-2: React app skeleton, routes, shared styles, fake-data forms. **No backend dependence initially.** _Status: skeleton done_ — Vite + React 19 + TypeScript, React Router v7 with `RootLayout` and lazy pages, Redux store with `uiSlice` and empty RTK Query `baseApi`, Tailwind CSS v4, toast notifications, Vitest setup. Remaining: add customer/analyst routes and placeholder pages, synthetic session/role slice, settle the `VITE_API_URL` vs `/api/v1` base path.
- **Exit:** fresh clone -> documented setup -> backend health, Camunda start, SQL Server available, frontend loads, PR checks pass.

### Increment 1 — Vertical slice: Automatic decision

- BE-1: Customer, transaction, dispute, decision schemas and rule evaluator; create/list/detail APIs.
- BE-2: Camunda process (start -> assessment -> auto decision -> end); audit transitions and workflow correlation.
- FS: API integration smoke tests / seeded demo accounts; early contract agreement.
- FE-1: transaction selection + submit UI (transactions/disputes endpoints injected into `baseApi`); FE-2: read-only case status/timeline components.
- **Demo:** select two synthetic transactions -> submit -> auto resolve -> view outcome. No RabbitMQ yet.

### Increment 2 — Manual review

- BE-2: BPMN user task, review timer, query and task completion integration.
- BE-1: analyst decision validation, final state consistency, audit entry.
- FE-2: analyst queue and review UI; FE-1: customer tracking of pending review.
- FS: E2E path and role enforcement checks.
- **Demo:** ambiguous case enters review; analyst decides with rationale; customer sees outcome. Timer exception test.

### Increment 3 — Messaging + Node.js

- BE-1: minimal outbox schema + terminal event creation in same transaction.
- FS: RabbitMQ configuration, Node consumer + backend receipt callback, explicit retry and DLQ behavior.
- BE-2: verify process completion and event transitions don't contradict business state.
- Frontend: notification delivery status in detail if useful (read-only).
- **Demo:** RabbitMQ offline during resolution -> event pending -> resumes -> Node receives once effectively; duplicate delivery ignored.

### Increment 4 — Observability + delivery

- FS & BE-2: structured logging, ELK dashboards/queries, Docker and CI finalized.
- BE-1: seed and concurrency verification; DB constraints and negative tests.
- FE-1/FE-2: UX and form error states, demo polish.
- Everyone: scenario scripts and knowledge transfer.
- **Demo:** full automatic, manual, rejected and timeout flows with inspectable logs and message retries.

### Backlog (team-ready)

| ID     | Task                                | Primary    | Dependency   | Done when                              |
| ------ | ----------------------------------- | ---------- | ------------ | -------------------------------------- |
| POC-01 | Repository, README, branch/PR rules | BE-2       | none         | Team can clone and run checks          |
| POC-02 | Local Compose + infrastructure      | FS         | POC-01       | Backend, SQL, broker, frontend boot    |
| POC-03 | SQL schema and synthetic seeds      | BE-1       | POC-02       | Repeatable migration+seed              |
| POC-04 | Domain models and matching tests    | BE-1       | POC-03       | Rules yield three outcomes             |
| POC-05 | Dispute REST endpoints              | BE-1       | POC-04       | Submit/list/get secured and tested     |
| POC-06 | Embedded Camunda process            | BE-2       | POC-02,04    | Auto process completes and persists    |
| POC-07 | React submit UI (RTK Query)         | FE-1       | API contract | Real request is submitted              |
| POC-08 | React tracking UI                   | FE-2       | API contract | Case status and timeline visible       |
| POC-09 | Camunda review task + timer         | BE-2       | POC-06       | Task and timeout branch demonstrated   |
| POC-10 | Analyst REST and access             | BE-1       | POC-09       | Decision with rationale / role checks  |
| POC-11 | Analyst React workspace             | FE-2       | POC-10       | Analyst completes a case               |
| POC-12 | Outbox + publisher confirms         | BE-1 + FS  | POC-05       | Pending event survives broker downtime |
| POC-13 | Node worker + retry / DLQ           | FS         | POC-12       | Mock delivery + idempotency shown      |
| POC-14 | ELK traceability                    | BE-2 + FS  | POC-06,13    | Search case by disputeId               |
| POC-15 | CI/CD build, tests, images          | FS         | POC-02       | PR build and tests reproducible        |
| POC-16 | E2E scenarios and documentation     | Whole team | 01–15        | Acceptance evidence available          |

### Team operating agreement

- Short architecture ADRs approved in PRs; avoid blocking feature delivery with long documents.
- PRs limited to one feature or decision; at least one reviewer from a related module.
- Define API contracts as shared examples/OpenAPI before parallel backend/frontend work.
- Hold one short integration demo per increment; unblock functional teams with synthetic fixtures/mock handlers early.
- Scope changes require team approval against In/Out of Scope baseline.

### Acceptance criteria for end-to-end demonstration

1. 20 automatic cases reach a justified terminal result.
2. 10 ambiguous cases proceed through analyst decision.
3. Five exception scenarios can be reproduced.
4. 20 repeated submissions do not create duplicate open disputes.
5. 20 terminal cases create notification jobs processed by the Node worker.
6. A temporary broker/worker outage is recovered with retry and no lost outcome.
7. At least 30 cases have traceable case/business/technical history.
8. GitHub Actions builds/tests the chosen deliverables and Docker images.
9. Synthetic concurrency of 25 users runs with measured latency and no silent data loss.

### Explicit exclusions and stop conditions

No money movement, real email/SMS, PAN/CVV, external networks, cloud/AKS production deployment, full IAM, real KYC/AML, Kafka, separate customer/card core systems, dashboards beyond demo needs. **Stop feature expansion when the success criteria are met.**

## Open, narrow design choices to settle in kickoff (not new discovery phase)

1. How to represent initial invalid cases consistently: immediate API rejection vs recorded `REJECTED_INELIGIBLE` workflow case.
2. Whether customer explicitly selects duplicate candidate or matching engine finds it automatically.
3. Seed dataset currency and merchant normalization examples.
4. Whether notification receipt is written via restricted backend callback (recommended) versus a dedicated worker-owned persistence store.
5. Final ADR approvals on embedded Camunda and minimal Outbox.

**Implementation principle:** start with a runnable vertical slice; don't require every detailed document to be perfected before working code, and keep the functional source of truth unchanged.
