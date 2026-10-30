# Card Dispute POC

Local development, installation, configuration, API reference, and verification guide.

> **Scope:** This guide covers a local Windows/PowerShell and IntelliJ IDEA setup with Docker Compose for infrastructure and separately runnable applications. It is not a production deployment guide. All example passwords are for a disposable local demonstration environment only.

## 1. Architecture and repository layout

| Directory        | Stack                                                                   | Responsibility                                                                      |
| ---------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `infra/`         | Docker Compose, SQL Server 2022, RabbitMQ 4.3.6                         | Database, broker, initialization, and RabbitMQ topology                             |
| `backend/`       | Java 17, Spring Boot 3.x, Spring Security, Camunda 7.24, JPA, Liquibase | Dispute API, workflow, transactional outbox, event publishing, and receipt callback |
| `frontend/`      | React 19, TypeScript, Vite 8                                            | Customer and analyst web UI                                                         |
| `notifications/` | NestJS 12, Node.js                                                      | RabbitMQ event consumer and notification worker                                     |

Expected message flow:

```text
Customer -> Spring Boot API -> automatic decision / Camunda manual review
         -> SQL Server notification_outbox -> Spring AMQP dispatcher
         -> RabbitMQ exchange card-dispute.events
         -> queue card-dispute.notifications -> NestJS worker
         -> backend receipt callback -> SQL Server notification_delivery
```

**Integration status:** Spring Boot publishing and its internal receipt endpoint have been verified independently. The NestJS HTTP client still needs to be aligned with the backend callback contract (see [Section 9](#9-known-backendworker-integration-gaps)). Starting every service does **not** by itself establish that the end-to-end notification flow has been verified.

## 2. Prerequisites

- Docker Desktop, Docker Compose v2, Linux containers enabled, and sufficient memory for SQL Server.
- **JDK 17** (`java -version`) and Maven 3.9.x (`mvn -version`).
- IntelliJ IDEA, recommended for running and debugging Spring Boot.
- **Node.js 22.13+** and npm 10+ for the React application; its own documentation recommends Node 24 LTS.
- Node.js compatible with NestJS 12 and `pnpm` for `notifications/`. Confirm the selected runtime with the worker owner.
- Available local ports: **1433** (SQL Server), **5672** (AMQP), **15672** (RabbitMQ Management), **8080** (backend), and **3000** (frontend in the documented configuration).

Run commands from the indicated directory. Never use `docker compose down -v` as a routine shutdown command: it deletes named volumes and can permanently remove local database and broker data.

## 3. Infrastructure setup

### 3.1 Create `infra/.env`

From the repository root in PowerShell:

```powershell
Copy-Item infra\.env.example infra\.env
```

Edit `infra/.env` to match the local SQL Server logins and RabbitMQ credentials used by the applications. Example placeholders:

```dotenv
MSSQL_SA_PASSWORD=<local-sa-password>
SQLSERVER_PORT=1433
CAMUNDA_DB_PASSWORD=<local-camunda-password>
BUSINESS_DB_PASSWORD=<local-business-password>
LIQUIBASE_DB_PASSWORD=<local-liquibase-password>
RABBITMQ_USER=bankpoc
RABBITMQ_PASSWORD=<local-rabbitmq-password>
BACKEND_AUTHORIZATION_KEY=<local-worker-key>
BACKEND_API_BASE_URL=http://host.docker.internal:8080
```

`infra/.env` is used by Docker Compose; it does **not** automatically configure the backend launched from IntelliJ. Configure the backend environment separately in [Section 4](#4-spring-boot-backend).

### 3.2 Start SQL Server and RabbitMQ

```powershell
cd infra
docker compose up -d sqlserver rabbitmq
docker compose ps
```

RabbitMQ should become `healthy`. Give SQL Server sufficient time to finish startup. Inspect logs as needed:

```powershell
docker compose logs -f sqlserver
docker compose logs -f rabbitmq
```

### 3.3 Initialize SQL Server (first-time setup)

```powershell
docker compose run --rm db-init
```

The `db-init` service executes `infra/db/init.sh` and supporting SQL scripts to prepare the `card_dispute_db` database, SQL Server users, and schemas.

**Existing data warning:** Do not assume that rerunning initialization is harmless against any existing database. Review the script and back up valuable local data first. Skip this step for an already initialized environment unless reinitialization is specifically required.

On Windows, keep `infra/db/init.sh` with **LF** line endings, not CRLF, to avoid Bash errors inside its Linux container.

### 3.4 Initialize RabbitMQ topology

```powershell
docker compose run --rm rabbitmq-topology
```

Expected output:

```text
Creating RabbitMQ exchange...
Creating RabbitMQ queue...
Creating RabbitMQ binding...
RabbitMQ topology initialized successfully.
```

The initialization service uses the RabbitMQ Management API and declares durable resources:

| Resource                    | Configuration                                   |
| --------------------------- | ----------------------------------------------- |
| Virtual host                | `/`                                             |
| Exchange                    | `card-dispute.events` (topic, durable)          |
| Queue                       | `card-dispute.notifications` (classic, durable) |
| Binding routing pattern     | `dispute.#`                                     |
| Backend publish routing key | `dispute.resolved.v1`                           |

Verify from the `infra/` directory:

```powershell
docker compose exec rabbitmq rabbitmqctl list_exchanges -p / name type durable
docker compose exec rabbitmq rabbitmqctl list_queues -p / name durable messages
docker compose exec rabbitmq rabbitmqctl list_bindings -p / source_name destination_name routing_key
```

RabbitMQ Management: **http://localhost:15672**; log in using `RABBITMQ_USER` and `RABBITMQ_PASSWORD` from `infra/.env`.

### 3.5 Subsequent startup

If the named volumes and topology already exist:

```powershell
cd infra
docker compose up -d sqlserver rabbitmq
```

The topology survives broker restarts in the `rabbitmq_data` volume. Run `rabbitmq-topology` again when provisioning a fresh broker or changing the topology. Run `db-init` only when database initialization is actually needed.

## 4. Spring Boot backend

### 4.1 Database and RabbitMQ configuration

`backend/src/main/resources/application.yml` configures three SQL Server data sources against `localhost:1433`, database `card_dispute_db`, plus RabbitMQ under `spring.rabbitmq`.

| Data source                           | SQL Server login               | Schema                                               |
| ------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `application.datasource.card-dispute` | `card_dispute_business_login`  | `card_dispute_business_schema`                       |
| `application.datasource.camunda`      | `card_dispute_camunda_login`   | `card_dispute_camunda_schema`                        |
| `application.datasource.liquibase`    | `card_dispute_liquibase_login` | `card_dispute_liquibase_schema` (Liquibase tracking) |

For a backend running directly on Windows through IntelliJ, use `localhost` or `127.0.0.1` for SQL Server and RabbitMQ. The hostnames `sqlserver` and `rabbitmq` resolve **inside the Docker Compose network**, not from the host application.

### 4.2 Required IntelliJ environment variables

Open **Run → Edit Configurations → Spring Boot/Application → Environment variables** and set the following values for the local demo:

```dotenv
CARD_DISPUTE_BUSINESS_PASSWORD=<<changeme>>
CARD_DISPUTE_CAMUNDA_PASSWORD=<<changeme>>
CARD_DISPUTE_LIQUIBASE_PASSWORD=<<changeme>>
NOTIFICATION_OUTBOX_ENABLED=<<true or false>>
NOTIFICATION_WORKER_PASSWORD_HASH=<<changeme>>
RABBITMQ_HOST=127.0.0.1
RABBITMQ_PASSWORD=<<changeme>>
RABBITMQ_PORT=5672
RABBITMQ_USER=bankpoc
```

These values reproduce the **local IntelliJ configuration**. They are demonstration credentials and should not be committed as application secrets or reused for shared/production environments. SQL Server passwords must agree with the matching values provisioned by `infra/.env` and `db-init`; the RabbitMQ password must match the broker.

| Variable                            | Purpose                                                                                  | Notes                                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `CARD_DISPUTE_BUSINESS_PASSWORD`    | Business SQL Server connection                                                           | Matches `BUSINESS_DB_PASSWORD` in infrastructure                                                                                        |
| `CARD_DISPUTE_CAMUNDA_PASSWORD`     | Camunda SQL Server connection                                                            | Matches `CAMUNDA_DB_PASSWORD`                                                                                                           |
| `CARD_DISPUTE_LIQUIBASE_PASSWORD`   | Liquibase SQL Server connection                                                          | Matches `LIQUIBASE_DB_PASSWORD`                                                                                                         |
| `NOTIFICATION_OUTBOX_ENABLED`       | Enables scheduled outbox dispatch                                                        | Set `true` to test publishing; YAML default is `false`                                                                                  |
| `NOTIFICATION_WORKER_PASSWORD_HASH` | Supplies `application.notification.worker.password-hash` for technical-user provisioning | The local value shown is `worker123!`; verify how the Liquibase configuration handles this property before assuming it is a BCrypt hash |
| `RABBITMQ_HOST`                     | AMQP broker host                                                                         | `127.0.0.1` for a host-based backend                                                                                                    |
| `RABBITMQ_PORT`                     | AMQP broker port                                                                         | `5672`                                                                                                                                  |
| `RABBITMQ_USER`                     | AMQP username                                                                            | Must match the broker                                                                                                                   |
| `RABBITMQ_PASSWORD`                 | AMQP password                                                                            | Must match the broker                                                                                                                   |

Optional overrides supported by `application.yml`:

```dotenv
RABBITMQ_VHOST=/
NOTIFICATION_RABBITMQ_EXCHANGE=card-dispute.events
NOTIFICATION_RABBITMQ_ROUTING_KEY=dispute.resolved.v1
CARD_DISPUTE_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CARD_DISPUTE_LIQUIBASE_CONTEXTS=
CARD_DISPUTE_MANUAL_REVIEW_TIMEOUT=PT48H
```

**Liquibase:** `spring.liquibase.enabled=false` is intentional. The project uses its own `application.liquibase` configuration and separate data source. Do not switch Spring Boot's default Liquibase auto-configuration on without reviewing the existing setup. An empty `CARD_DISPUTE_LIQUIBASE_CONTEXTS` enables all relevant change-log contexts; use the `db-init` context to omit synthetic demo data when appropriate.

### 4.3 Build and start

```powershell
cd backend
mvn clean verify
mvn spring-boot:run
```

Alternatively, open `backend/pom.xml` in IntelliJ, select **JDK 17**, configure the environment variables, and run `CardDisputeApplication`.

Useful local URLs:

- Backend health: **http://localhost:8080/actuator/health**
- Swagger UI: **http://localhost:8080/swagger-ui/index.html**
- OpenAPI JSON: **http://localhost:8080/v3/api-docs**
- Camunda web UI: **http://localhost:8080/camunda/** (local admin `demo` / `demo`)

If the broker lacks `card-dispute.events`, Spring Boot may still start, but outbox dispatch will fail with `404 NOT_FOUND - no exchange`. Initialize the RabbitMQ topology first.

### 4.4 REST API reference

Business endpoints use **HTTP Basic** authentication. The authenticated principal provides identity information; it must not be trusted from an arbitrary request body.

| Method | Path                                       | Purpose                                          | Required role                                                          |
| ------ | ------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------- |
| `GET`  | `/api/v1/transactions`                     | List own transactions (paginated)                | `CUSTOMER`                                                             |
| `GET`  | `/api/v1/transactions/{transactionId}`     | Get own transaction                              | `CUSTOMER`                                                             |
| `POST` | `/api/v1/disputes`                         | Create a dispute and start evaluation/workflow   | `CUSTOMER`                                                             |
| `GET`  | `/api/v1/disputes`                         | List disputes (`status`, `page`, `size`, `sort`) | `CUSTOMER` or `DISPUTE_ANALYST`, subject to service-level access rules |
| `GET`  | `/api/v1/disputes/{disputeId}`             | Dispute details                                  | `CUSTOMER` or `DISPUTE_ANALYST`                                        |
| `GET`  | `/api/v1/disputes/{disputeId}/timeline`    | Dispute event timeline                           | `CUSTOMER` or `DISPUTE_ANALYST`                                        |
| `GET`  | `/api/v1/workflow/tasks?page=0&size=20`    | List pending Camunda review tasks                | `DISPUTE_ANALYST`                                                      |
| `GET`  | `/api/v1/workflow/tasks/{taskId}`          | Get active task details                          | `DISPUTE_ANALYST`                                                      |
| `POST` | `/api/v1/workflow/tasks/{taskId}/complete` | Submit analyst decision; HTTP `202`              | `DISPUTE_ANALYST`                                                      |
| `POST` | `/internal/v1/notification-receipts`       | Record an idempotent notification receipt        | `NOTIFICATION_WORKER`                                                  |
| `GET`  | `/actuator/health`                         | Backend health                                   | Public                                                                 |
| `GET`  | `/v3/api-docs`, `/swagger-ui/**`           | API specification and Swagger UI                 | Public                                                                 |
| `/**`  | `/engine-rest/**`                          | Camunda REST API                                 | `DISPUTE_ANALYST`                                                      |

The configured roles are `CUSTOMER`, `DISPUTE_ANALYST`, and `NOTIFICATION_WORKER`. The Camunda web UI under `/camunda/**` uses its own authentication mechanism.

**Receipt response semantics:** `201 Created` for a new receipt; `200 OK` for an identical replay; `409 Conflict` for a different receipt with the same `eventId`.

### 4.5 Example requests

List transactions with a local demo customer:

```powershell
curl.exe -u "customer005:demo" "http://localhost:8080/api/v1/transactions?page=0&size=10"
```

Create a sample dispute if the synthetic data has been loaded and the transaction pair has not already been used:

```http
POST http://localhost:8080/api/v1/disputes
Authorization: Basic <customer-credentials>
Content-Type: application/json
```

```json
{
  "transactionId": "d0020000-0000-4000-8000-000000002011",
  "candidateTransactionId": "d0020000-0000-4000-8000-000000002012",
  "reasonCode": "POSSIBLE_DUPLICATE",
  "description": "RabbitMQ publication smoke test"
}
```

List analyst tasks with `analyst001` / `demo`:

```http
GET http://localhost:8080/api/v1/workflow/tasks?page=0&size=20
Authorization: Basic <analyst-credentials>
```

To complete an active task:

```http
POST http://localhost:8080/api/v1/workflow/tasks/{taskId}/complete
Authorization: Basic <analyst-credentials>
Content-Type: application/json
```

```json
{
  "disputeId": "<actual-dispute-uuid>",
  "decision": "DUPLICATE_SUPPORTED",
  "comment": "Manual review POC"
}
```

To simulate the notification worker callback, use **Basic Auth** with the technical account `notification-worker` and actual IDs from `notification_outbox`:

```http
POST http://localhost:8080/internal/v1/notification-receipts
Authorization: Basic <technical-user-credentials>
Content-Type: application/json
```

```json
{
  "eventId": "<actual-outbox-uuid>",
  "disputeId": "<actual-dispute-uuid>",
  "channel": "MOCK_EMAIL",
  "status": "DELIVERED",
  "processedAt": "2026-10-30T20:00:00Z",
  "providerRef": "mock-readme-001",
  "errorCode": null
}
```

First valid request: `201`; identical replay: `200`; contradictory data for the same event: `409`.

### 4.6 SQL Server verification queries

```sql
SELECT TOP (10)
    outbox_id, dispute_id, event_type, status,
    attempt_count, published_at, last_error
FROM card_dispute_business_schema.notification_outbox
ORDER BY created_at DESC;

SELECT TOP (10)
    event_id, dispute_id, channel, status,
    processed_at, provider_ref, error_code
FROM card_dispute_business_schema.notification_delivery
ORDER BY processed_at DESC;
```

Successfully confirmed events transition to `PUBLISHED`. The AMQP message has `pattern = dispute.resolved.v1`; `data.eventId` and AMQP `message_id` should equal the SQL Server `outbox_id`.

## 5. React frontend

### 5.1 Local development

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open **http://localhost:3000**, or the URL printed by Vite if a different port is selected.

Example `frontend/.env.local` for a real backend:

```dotenv
VITE_API_URL=/api
BACKEND_URL=http://localhost:8080
VITE_DEMO_PASSWORD=demo
VITE_USE_MOCKS=false
```

Vite proxies `/api` to the backend. To work without Spring Boot, set `VITE_USE_MOCKS=true` to enable Mock Service Worker (MSW). Mock mode is not evidence of real backend integration.

Additional commands:

```powershell
npm run typecheck
npm run test:run
npm run build
```

### 5.2 Frontend in Docker

The Compose file also defines a `frontend` service exposing port 3000:

```powershell
cd infra
docker compose up -d --build frontend
```

**Docker URL caveat:** The build-time `VITE_API_URL` can be derived from `BACKEND_API_BASE_URL`. A URL such as `http://backend:8080/api` will not work from the host browser unless a suitable backend host is actually reachable; the Compose setup does not define a `backend` service. For development with the backend in IntelliJ, prefer `npm run dev` and a Vite proxy using `BACKEND_URL=http://localhost:8080`.

## 6. NestJS notification worker

### 6.1 Docker Compose

After starting RabbitMQ topology and Spring Boot:

```powershell
cd infra
docker compose up -d --build notifications
docker compose logs -f notifications
```

The `notifications` Compose service supplies:

| Variable                     | Meaning                                                |
| ---------------------------- | ------------------------------------------------------ |
| `RABBITMQ_CONNECTION_STRING` | `amqp://<user>:<password>@rabbitmq:5672` inside Docker |
| `RABBITMQ_QUEUE_NAME`        | `card-dispute.notifications`                           |
| `RABBITMQ_EXCHANGE_NAME`     | `card-dispute.events`                                  |
| `RABBITMQ_ROUTING_KEY`       | `dispute.#`                                            |
| `BACKEND_AUTHORIZATION_KEY`  | Worker-side authorization setting from `infra/.env`    |
| `BACKEND_API_BASE_URL`       | Backend URL consumed by the worker's HTTP client       |

The worker starts as an **RMQ microservice**, not a general-purpose HTTP server. Do not assume it exposes a localhost HTTP endpoint when none is published by Compose.

### 6.2 Local worker development

```powershell
cd notifications
pnpm install
pnpm run start:dev
```

Configure the variables required by `notifications/src/config/env.ts` before starting. When running outside Docker, use `127.0.0.1:5672` rather than the Docker hostname `rabbitmq`; a host-based worker should use `http://localhost:8080` for a host-based backend.

Useful worker commands:

```powershell
pnpm run test
pnpm run test:e2e
pnpm run build
```

Review the known callback incompatibilities in [Section 9](#9-known-backendworker-integration-gaps) before claiming an end-to-end test has passed.

## 7. Recommended startup order

For a **fresh local setup** (each `cd` assumes a terminal opened at the repository root):

```powershell
# Terminal 1: infrastructure
cd infra
docker compose up -d sqlserver rabbitmq
docker compose run --rm db-init
docker compose run --rm rabbitmq-topology

# Terminal 2: backend (configure environment variables first)
cd backend
mvn spring-boot:run

# Terminal 3: frontend
cd frontend
npm install
npm run dev

# Terminal 4: worker (only for integration testing)
cd infra
docker compose up -d --build notifications
```

On subsequent launches, skip `db-init` and `rabbitmq-topology` when the database, volumes, and topology already exist. Starting **infrastructure → backend → frontend → worker** makes troubleshooting easier and prevents the worker from consuming messages while you inspect RabbitMQ.

## 8. Troubleshooting and inspection

| Symptom                                         | Check                                                           | Suggested action                                                   |
| ----------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| Backend cannot connect to SQL Server            | Container status, port 1433, `.env` versus IntelliJ credentials | Confirm `db-init` provisioned the required users and schemas       |
| `RabbitMQ host/port = null`                     | YAML hierarchy                                                  | Place `rabbitmq` under `spring`, not under `camunda`               |
| `Connection refused` on port 5672               | Container health and published port                             | Check `docker compose ps rabbitmq` and host connectivity           |
| `NOT_FOUND - no exchange 'card-dispute.events'` | Exchange/queue/binding                                          | Run `docker compose run --rm rabbitmq-topology`                    |
| Topology initializer exits with no output       | `docker compose config`                                         | Ensure `command` is a single multiline argument (`command: -       | `), not split into separate arguments |
| Event remains `PENDING`                         | Scheduler, `next_attempt_at`, `last_error`                      | Set `NOTIFICATION_OUTBOX_ENABLED=true` and check RabbitMQ          |
| Event remains `FAILED`                          | Exhausted publish attempts                                      | No automatic replay without an explicit recovery path              |
| Outbox is `PUBLISHED`, but queue looks empty    | Active consumers and message counts                             | Inspect `messages_ready`, `messages_unacknowledged`, and consumers |
| Worker callback fails                           | Path, authentication, receipt payload                           | Compare both contracts in Section 9                                |
| Frontend only shows simulated data              | `VITE_USE_MOCKS=true`                                           | Set `false` and restart Vite                                       |

Inspect queue metrics:

```powershell
cd infra
docker compose exec rabbitmq rabbitmqctl list_queues -p / name messages_ready messages_unacknowledged consumers
```

To inspect a message in RabbitMQ Management, open **Queues and Streams → card-dispute.notifications → Get messages** and choose **Nack message requeue true**. Fetching messages can be destructive if requeue is disabled. A `PUBLISHED` outbox row confirms broker publication, not that the message will remain in a queue after consumption.

## 9. Known backend/worker integration gaps

The backend publish path and the internal callback have been tested independently, but `notifications/src/api/http-api.service.ts` does not yet match the backend API:

| Area               | Spring Boot backend                                            | NestJS worker                                                      |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Receipt callback   | `POST /internal/v1/notification-receipts`                      | Sends `POST <base>/notifications`                                  |
| Receipt lookup     | No matching `GET /notifications/{eventId}` endpoint            | Calls `GET <base>/notifications/{eventId}`                         |
| Authorization      | HTTP Basic via `Authorization` header                          | Uses `Authentication` with `BACKEND_AUTHORIZATION_KEY`             |
| Allowed channel    | `MOCK_EMAIL`                                                   | Worker-side contract needs alignment                               |
| Duplicate handling | `200` means identical receipt; `409` means conflicting receipt | Treats `409` as already handled                                    |
| Docker-to-host URL | `http://host.docker.internal:8080` for a host-based backend    | `http://backend:8080/api` only works if that Docker service exists |

**Do not report the complete NestJS → backend callback flow as integrated solely because the worker container starts.** Updating the worker client belongs to the frontend/worker team. Avoid adding legacy routes to Spring Boot solely to accommodate an outdated client contract.

## 10. Shutdown and maintenance

From `infra/`:

```powershell
docker compose stop notifications frontend rabbitmq sqlserver
# Or stop and remove Compose-managed containers while preserving named volumes:
docker compose down
```

`docker compose down` without `-v` preserves named volumes. Only delete `sqlserver_data` or `rabbitmq_data` if you deliberately intend to lose local data.

Frequently used commands:

```powershell
# From infra/: service status
docker compose ps

# From infra/: broker logs
docker compose logs -f rabbitmq

# From infra/: notification worker logs
docker compose logs -f notifications

# From infra/: validate final Compose configuration
docker compose config

# From backend/: Maven regression suite
mvn clean verify
```

---

**Backend acceptance criteria:** Spring Boot starts; Liquibase applies the database migrations; Camunda resolves a dispute; the transactional outbox stores `DISPUTE_RESOLVED`; RabbitMQ receives a persistent event; the outbox transitions to `PUBLISHED`; and the secured internal endpoint accepts an idempotent notification receipt. End-to-end validation with the actual NestJS worker remains a separate integration activity until the contracts in Section 9 have been aligned.
