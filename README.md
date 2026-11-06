# Card Dispute POC

Local development, installation, configuration, API reference, and verification guide.

> **Scope:** This guide covers the **complete local Docker Compose setup** (SQL Server, RabbitMQ, Spring Boot/Camunda, NestJS, React/Nginx) and optional standalone development with Windows/PowerShell and IntelliJ IDEA. It is a POC, not a production deployment guide. Use synthetic demonstration data and local-only credentials.

## 1. Architecture and repository layout

| Directory        | Stack                                                                   | Responsibility                                                                      |
| ---------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `infra/`         | Docker Compose, SQL Server 2022, RabbitMQ 4.3.6                         | Full-stack orchestration, database initialization, images, and broker topology      |
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

**Integration status (local POC):** The team has validated a complete path: React → Nginx → Spring Boot → SQL Server, and an independently triggered `DISPUTE_RESOLVED` outbox event → RabbitMQ → NestJS → the authenticated Spring Boot receipt endpoint → `notification_delivery`. This documents observed local tests, **not** an automated clean-clone or failure/retry certification. The Compose default intentionally leaves `NOTIFICATION_OUTBOX_ENABLED=false`.

## 2. Prerequisites

**To run the entire POC with Docker:**

- Git, Docker Desktop, Docker Compose v2, and Linux containers enabled; allocate enough Docker memory for SQL Server.
- Available ports: **1433** (SQL Server, local loopback), **5672** (AMQP, loopback), **15672** (RabbitMQ Management, loopback), **8080** (Spring Boot, loopback), and **3000** (React/Nginx).
- PowerShell on Windows is used in the examples below. Git Bash is also supported, with the path-conversion caveat in [Section 8](#8-troubleshooting-and-inspection).

**Only for running applications outside Docker:** JDK 17, Maven 3.9.x, IntelliJ IDEA (optional), Node.js compatible with the React/NestJS projects, npm for React, and `pnpm` for the worker. These tools are **not necessary on the host** to build the Dockerized services.

Run Compose commands from `infra/` unless stated otherwise. **Never run `docker compose down -v` during routine shutdown:** that removes the named volumes holding local SQL Server and RabbitMQ data.

## 3. Infrastructure setup

### 3.1 Configure `infra/.env`

From the repository root in PowerShell:

```powershell
Copy-Item infra\.env.example infra\.env
```

Edit `infra/.env` with **your own local development credentials**. The current Compose file reads these variables:

```dotenv
MSSQL_SA_PASSWORD=<local-sa-password>
SQLSERVER_PORT=1433
CAMUNDA_DB_PASSWORD=<local-camunda-password>
BUSINESS_DB_PASSWORD=<local-business-password>
LIQUIBASE_DB_PASSWORD=<local-liquibase-password>

RABBITMQ_USER=bankpoc
RABBITMQ_PASSWORD=<local-rabbitmq-password>

# Despite its name, this is a local plaintext password, encoded by Spring before SQL insertion.
NOTIFICATION_WORKER_PASSWORD_HASH=<local-notification-worker-password>
NOTIFICATIONS_BACKEND_API_BASE_URL=http://backend:8080
```

Replace every placeholder. SQL Server login passwords must meet its password policy. For this POC, choose a RabbitMQ password that is also safe to embed in an AMQP URI, or URL-encode reserved characters in the connection string before use. Do not reuse real credentials.

- `infra/.env` is ignored by Git and must **never** be committed. `infra/.env.example` is the template.
- The same `NOTIFICATION_WORKER_PASSWORD_HASH` value is passed to Spring Boot and to NestJS as `BACKEND_BASIC_AUTH_PASSWORD`. In `LiquibaseConfig.java`, Spring **BCrypt-encodes** the supplied value before inserting the technical user. The variable name is historical/misleading: do **not** put a precomputed BCrypt hash in it.
- The worker connects to `http://backend:8080` on the Compose network, **without** an `/api` suffix. It calls `/internal/v1/notification-receipts`.
- The frontend build uses `VITE_API_URL=/api` from `infra/compose.yaml`; **no** `BACKEND_API_BASE_URL` variable is required in `infra/.env` for the frontend.
- If a database volume already exists and the technical user was previously provisioned, changing this password in `.env` does not automatically update the stored BCrypt hash. Keep both services aligned or perform an explicit credential update.

Validate the Compose configuration:

```powershell
cd infra
docker compose config --quiet
```

### 3.2 Start SQL Server and RabbitMQ

From `infra/`:

```powershell
docker compose up -d sqlserver rabbitmq
docker compose ps
```

Wait until RabbitMQ is **healthy**. SQL Server may need additional startup time:

```powershell
docker compose logs --tail=80 sqlserver
docker compose logs --tail=80 rabbitmq
```

### 3.3 Initialize the database (first time only)

```powershell
docker compose run --rm db-init
```

`db-init` executes `infra/db/init.sh` and the SQL files under `infra/db/scripts/`. It provisions database `card_dispute_db`, schemas, SQL logins, and permissions. **It does not replace Liquibase**: the Spring Boot application runs the business schema and demo-data migrations on startup, including the `notification-worker` account.

A successful one-off run prints `Database initialization completed.`. Never reinitialize an existing database casually; inspect the scripts and back up data if needed. `.gitattributes` ensures `*.sh` uses LF endings for Linux containers.

### 3.4 Initialize RabbitMQ topology

```powershell
docker compose run --rm rabbitmq-topology
```

Expected:

```text
Creating RabbitMQ exchange...
Creating RabbitMQ queue...
Creating RabbitMQ binding...
RabbitMQ topology initialized successfully.
```

The initializer uses RabbitMQ's HTTP Management API. The main queue is declared from `infra/rabbitmq/notification-queue.json`, **not** from a shortened JSON string embedded in Compose. Its dead-letter arguments must agree with NestJS to avoid `PRECONDITION_FAILED` / HTTP 400 on redeclaration.

| Resource | Configuration |
| --- | --- |
| Virtual host | `/` |
| Main exchange | `card-dispute.events` (`topic`, durable) |
| Main queue | `card-dispute.notifications` (`classic`, durable) |
| Main binding | `dispute.#` |
| Publish routing key | `dispute.resolved.v1` |
| Dead-letter exchange | `card-dispute.events.dlx` |
| Dead-letter routing key | `card-dispute.notifications.dlq` |
| Retry/DLQ queues | Managed by the NestJS worker's messaging setup |

Management UI: **http://localhost:15672** (credentials from `infra/.env`). To inspect queues from `infra/`:

```powershell
docker compose exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
```

In Git Bash, **do not pass** `-p /` unescaped: MSYS may convert `/` to a Windows path. Omitting `-p` uses the default `/` virtual host; alternatively prefix the command with `MSYS_NO_PATHCONV=1`.

### 3.5 Build and start the remaining services (full Docker setup)

**After** completing Sections 3.2–3.4 on a new environment, from `infra/`:

```powershell
# The database and broker were initialized explicitly above.
# --no-deps avoids automatically rerunning the db-init dependency.
docker compose up -d --build --no-deps backend

# Confirm Spring Boot has finished booting before using the API.
docker compose logs --tail=80 backend
curl.exe -i http://localhost:8080/actuator/health

# Once the health endpoint returns HTTP 200 with {"status":"UP"}:
docker compose up -d --build --no-deps notifications frontend
docker compose ps -a
```

A successful Spring Boot startup runs the pending Liquibase changesets, initializes Camunda, and starts Tomcat on port 8080. On the first run, verify the health endpoint returns `200` and `{"status":"UP"}` **before** starting a flow that calls the backend. Allow enough time for database migrations and Camunda startup.

The explicit `--no-deps` commands above are appropriate **only because** database initialization and broker readiness have already been verified. Do not skip Section 3.3 for a brand-new SQL volume. In this Compose version, `backend` also declares `db-init: service_completed_successfully`; a general `docker compose up` may start that one-off service as a dependency, which is why the first-run steps are shown explicitly.

### 3.6 Subsequent startup with persistent volumes

When the database and RabbitMQ volumes are already initialized, **do not routinely rerun `db-init`**. From `infra/`, start the infrastructure first:

```powershell
docker compose up -d --no-deps sqlserver rabbitmq
# Check RabbitMQ health and SQL Server readiness before the next command.
docker compose ps

docker compose up -d --no-deps backend
# Wait for /actuator/health to return UP.
docker compose up -d --no-deps notifications frontend
```

Use `--build` again **only if source code or Dockerfiles have changed**. The broker topology persists in `rabbitmq_data`, so rerun `rabbitmq-topology` for a new broker or an intentional topology change. Re-running it with incompatible queue arguments can produce HTTP 400 and must be investigated rather than ignored.

## 4. Spring Boot backend

### 4.1 Database and RabbitMQ configuration

`backend/src/main/resources/application.yml` uses environment-based addresses. For SQL Server the JDBC URL is `jdbc:sqlserver://${DB_HOST:localhost}:${DB_PORT:1433};...`; RabbitMQ uses `spring.rabbitmq` with `RABBITMQ_HOST`, `RABBITMQ_PORT`, and credentials.

| Data source | SQL Server login | Schema |
| --- | --- | --- |
| `application.datasource.card-dispute` | `card_dispute_business_login` | `card_dispute_business_schema` |
| `application.datasource.camunda` | `card_dispute_camunda_login` | `card_dispute_camunda_schema` |
| `application.datasource.liquibase` | `card_dispute_liquibase_login` | `card_dispute_liquibase_schema` (Liquibase tracking) |

**In Docker Compose**, `DB_HOST=sqlserver`, `DB_PORT=1433`, `RABBITMQ_HOST=rabbitmq`, `RABBITMQ_PORT=5672`, `RABBITMQ_VHOST=/`, and database passwords are injected by `infra/compose.yaml`. The backend image comes from `infra/dockerfiles/backend.Dockerfile` (Java 17/Maven build, Java 17 runtime). It normalizes Java line endings to LF during the build so Maven Spotless checks work in the Linux image; this does not rewrite the host's source files.

**Outside Docker**, use `localhost` / `127.0.0.1`; Docker service names are only resolvable on the Compose network.

### 4.2 Required IntelliJ environment variables (optional host-based backend)

If running Spring Boot directly in IntelliJ rather than via Compose, open **Run → Edit Configurations → Spring Boot/Application → Environment variables** and set local values:

```dotenv
DB_HOST=localhost
DB_PORT=1433
CARD_DISPUTE_BUSINESS_PASSWORD=<local-business-password>
CARD_DISPUTE_CAMUNDA_PASSWORD=<local-camunda-password>
CARD_DISPUTE_LIQUIBASE_PASSWORD=<local-liquibase-password>
RABBITMQ_HOST=127.0.0.1
RABBITMQ_PORT=5672
RABBITMQ_USER=bankpoc
RABBITMQ_PASSWORD=<local-rabbitmq-password>
NOTIFICATION_WORKER_PASSWORD_HASH=<local-notification-worker-password>
NOTIFICATION_OUTBOX_ENABLED=false
```

The three database passwords must match the corresponding values in `infra/.env` used by the initialization SQL scripts. `NOTIFICATION_WORKER_PASSWORD_HASH` is encoded by `LiquibaseConfig.java` for the stored account and must match the worker's supplied Basic Auth password; it is **not** a pre-hashed BCrypt value. Do not commit credentials.

Optional properties supported by `application.yml`:

```dotenv
RABBITMQ_VHOST=/
NOTIFICATION_RABBITMQ_EXCHANGE=card-dispute.events
NOTIFICATION_RABBITMQ_ROUTING_KEY=dispute.resolved.v1
CARD_DISPUTE_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CARD_DISPUTE_LIQUIBASE_CONTEXTS=
CARD_DISPUTE_MANUAL_REVIEW_TIMEOUT=PT48H
```

`NOTIFICATION_OUTBOX_ENABLED=false` is also the **current Compose default**. Turn it on deliberately when testing actual publication and return it to `false` afterward. A health response of `UP` alone does not prove AMQP delivery.

**Liquibase:** `spring.liquibase.enabled=false` is intentional: the project runs Liquibase through a custom `application.liquibase` setup and separate datasource. With empty `CARD_DISPUTE_LIQUIBASE_CONTEXTS`, all relevant migrations, including demo seed, are considered. Set `db-init` when you intentionally want to exclude synthetic data.

### 4.3 Build and start without Docker (optional)

From `backend/` with JDK 17, Maven, and environment variables configured:

```powershell
mvn clean verify
mvn spring-boot:run
```

Or run `CardDisputeApplication` in IntelliJ. For the **Docker image** use `docker compose build backend` from `infra/` instead. The required Compose runtime variables are already declared in `infra/compose.yaml`.

Useful local URLs:

- Backend health: **http://localhost:8080/actuator/health**
- Swagger UI: **http://localhost:8080/swagger-ui/index.html**
- OpenAPI JSON: **http://localhost:8080/v3/api-docs**
- Camunda web UI: **http://localhost:8080/camunda/** (`demo` / `demo` in this local POC)

If the broker lacks `card-dispute.events`, Spring Boot may start but outbox publishing can fail with `NOT_FOUND - no exchange`; initialize the RabbitMQ topology first.

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

Run against `card_dispute_db` in SQL Server Management Studio or a compatible SQL client:

```sql
USE card_dispute_db;
GO

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

### 5.1 Local development (Vite)

From `frontend/`:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Open **http://localhost:3000** (or the port printed by Vite). Example `frontend/.env.local` for a local backend:

```dotenv
VITE_API_URL=/api
BACKEND_URL=http://localhost:8080
VITE_DEMO_PASSWORD=demo
VITE_USE_MOCKS=false
```

Vite proxies `/api` to `BACKEND_URL`. With `VITE_USE_MOCKS=true`, the frontend uses Mock Service Worker data instead of the backend; mocks **do not** establish integration with SQL Server.

Other commands:

```powershell
npm run typecheck
npm run test:run
npm run build
```

The UI has a **demo-user selector**, not a traditional login page. It sends Basic Auth credentials with API requests. Demo labels, configured usernames, and seeded accounts must remain aligned; verify requests in browser DevTools if a selected identity receives `401` or an unexpectedly empty list.

### 5.2 Frontend in Docker Compose (React + Nginx)

From `infra/`, after Spring Boot is available:

```powershell
docker compose up -d --build --no-deps frontend
docker compose exec frontend nginx -t
curl.exe -I http://localhost:3000/
```

Open **http://localhost:3000**. The current Compose build argument is `VITE_API_URL=/api`. Nginx serves the built React SPA and proxies `/api/` to `http://backend:8080` **without removing the `/api` prefix**. This avoids exposing the internal Docker hostname to the browser. The proxy passes the original `Host` header via `$http_host`, preserving the frontend port in backend-generated `Location` headers.

`VITE_API_URL` is embedded at **build time**. After changing `frontend/nginx.conf` or the frontend build arguments, rebuild and recreate only the frontend:

```powershell
docker compose build frontend
docker compose up -d --no-deps --force-recreate frontend
```

Quick proxy checks:

```powershell
# No credentials: HTTP 401 from Spring Boot is expected.
curl.exe -i http://localhost:3000/api/v1/transactions

# With demo credentials (when demo seed is present): HTTP 200 and paginated JSON.
curl.exe -i -u "customer001:demo" "http://localhost:3000/api/v1/transactions?page=0&size=3"
```

From Chrome DevTools → **Network**, verify `GET /api/v1/disputes` and `GET /api/v1/transactions` return JSON and `POST /api/v1/disputes` can return `201 Created`; a successful response should have a `Location` URL beginning with `http://localhost:3000/api/v1/disputes/`. Use synthetic transactions and avoid repeating the same test pair if a dispute already exists.

## 6. NestJS notification worker

### 6.1 Docker Compose

After initializing RabbitMQ topology and starting Spring Boot:

```powershell
cd infra
docker compose up -d --build --no-deps notifications
docker compose logs --tail=80 notifications
```

The worker runs as a **RabbitMQ microservice**, not an exposed HTTP API. Its Compose configuration includes:

| Variable in the NestJS container | Value / purpose |
| --- | --- |
| `RABBITMQ_CONNECTION_STRING` | `amqp://<user>:<password>@rabbitmq:5672` |
| `RABBITMQ_QUEUE_NAME` | `card-dispute.notifications` |
| `RABBITMQ_EXCHANGE_NAME` | `card-dispute.events` |
| `RABBITMQ_ROUTING_KEY` | `dispute.#` |
| `BACKEND_API_BASE_URL` | From `NOTIFICATIONS_BACKEND_API_BASE_URL`, default `http://backend:8080` |
| `BACKEND_BASIC_AUTH_PASSWORD` | From `NOTIFICATION_WORKER_PASSWORD_HASH` in `infra/.env` |

`notifications/src/config/env.ts` sets the Basic Auth username to `notification-worker`; the client in `notifications/src/api/http-api.service.ts` calls **`POST /internal/v1/notification-receipts`** and sends `Authorization: Basic ...`. This matches the backend's secured receipt endpoint. On the POC's successful test, NestJS consumed the event and Spring Boot recorded `DELIVERED` in `notification_delivery`.

The current worker channel uses **NTFY** (a third-party notification service), while the receipt stored in SQL Server uses the channel name `MOCK_EMAIL`. These are not evidence of delivery of an actual email. Use **synthetic, non-sensitive content only**; do not send customer data to demonstration notification endpoints.

### 6.2 Local worker development

From `notifications/`:

```powershell
pnpm install
pnpm run start:dev
```

Configure the variables required by `notifications/src/config/env.ts`. For an app running on the host rather than Docker, use `127.0.0.1:5672` for RabbitMQ and `http://localhost:8080` as the backend base URL. Keep the same technical account credentials used by Spring Boot.

```powershell
pnpm run test
pnpm run test:e2e
pnpm run build
```

**Reliability scope:** the normal publish/consume/ack path was exercised in a local POC. Deliberate negative tests for retries, DLQ, outages, and redelivery are not recorded here as passed.

## 7. Recommended startup order

For a **new clone / fresh named volumes**, use the sequence below in **PowerShell**. All commands after `cd infra` run from that directory:

```powershell
# From repository root, once per local checkout:
Copy-Item infra\.env.example infra\.env
# Fill in all passwords in infra/.env, then:
cd infra
docker compose config --quiet

# Start the persistent infrastructure.
docker compose up -d sqlserver rabbitmq

# Initialize SQL logins/schemas and the main RabbitMQ topology.
docker compose run --rm db-init
docker compose run --rm rabbitmq-topology

# Start backend without rerunning the one-off db-init dependency.
docker compose up -d --build --no-deps backend
# Wait for HTTP 200 + {"status":"UP"}:
curl.exe -i http://localhost:8080/actuator/health

# Then start the worker and the web app.
docker compose up -d --build --no-deps notifications frontend
docker compose ps -a
```

A backend that is still starting may not respond to the first health request; check its logs before proceeding. URLs: **http://localhost:3000** (React), **http://localhost:8080/swagger-ui/index.html** (Swagger), **http://localhost:15672** (RabbitMQ UI).

For an **already-initialized environment**, follow [Section 3.6](#36-subsequent-startup-with-persistent-volumes). Do not execute `db-init` on every launch. If you prefer IntelliJ/Vite outside Docker, see Sections 4.2–4.3 and 5.1.

## 8. Troubleshooting and inspection

| Symptom | Check | Suggested action |
| --- | --- | --- |
| `docker compose config` reports a missing variable | `infra/.env` | Copy `.env.example` to `.env`, fill required values, and rerun `config --quiet` |
| SQL Server or backend fails to connect | `docker compose ps -a`, `db-init` logs, database passwords | Start SQL Server first, run first-time initialization, and keep the three passwords consistent |
| `db-init` fails with `$'\r'` or `pipefail` errors | CRLF in `infra/db/init.sh` | Keep LF line endings using `.gitattributes`; rerun initialization only after reviewing the database state |
| Maven `spotless:check` fails on many Java files | CRLF line endings or Java formatting | The backend Dockerfile normalizes `.java` line endings in its build stage; avoid blindly formatting all teammates' files |
| RabbitMQ exchange missing | Broker topology | Run `docker compose run --rm rabbitmq-topology` after broker health is confirmed |
| RabbitMQ topology API returns HTTP 400 | Existing queue attributes vs `notification-queue.json` / NestJS configuration | Inspect `durable`, `x-dead-letter-exchange`, and `x-dead-letter-routing-key`; do not delete queues with data casually |
| Worker calls `http://backend:8080/api/internal/...` | Worker base URL | Set `NOTIFICATIONS_BACKEND_API_BASE_URL=http://backend:8080`, then recreate `notifications` |
| Worker callback returns `401` or `403` | `notification-worker` account and Basic Auth | Verify the Liquibase user exists and the configured password matches the one stored at provisioning time |
| Outbox event remains `PENDING` | `NOTIFICATION_OUTBOX_ENABLED`, `next_attempt_at`, backend logs | The default is **false**; enable it deliberately only for a publication test and recreate `backend` |
| Outbox is `PUBLISHED` but queue is empty | Consumers, `Ready` / `Unacked`, worker logs | A consumer may already have acknowledged the message; also check `notification_delivery` |
| Nginx serves React but browser API calls fail | `VITE_API_URL` and `/api/` proxy | Use build-time `/api`, rebuild the frontend, and verify backend health |
| Backend `Location` header omits `:3000` | Nginx `Host` header | Use `proxy_set_header Host $http_host;` and rebuild/recreate the frontend |
| Git Bash changes `/` into `C:/Program Files/Git/` | MSYS path conversion | Omit `-p /` for RabbitMQ's default vhost, or use `MSYS_NO_PATHCONV=1` |

Useful commands from `infra/`:

```powershell
docker compose config --quiet
docker compose ps -a
docker compose logs --tail=100 backend
docker compose logs --tail=100 notifications
docker compose exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
docker compose exec backend printenv NOTIFICATION_OUTBOX_ENABLED
```

To inspect a message in the Management UI, be careful with **Get messages**: it can change delivery state or remove a message if requeue is disabled. Prefer non-destructive queue counts and application logs first.

To inspect the event and its receipt in SQL Server:

```sql
USE card_dispute_db;
GO

SELECT TOP (10) outbox_id, dispute_id, event_type, status,
    attempt_count, published_at, last_error
FROM card_dispute_business_schema.notification_outbox
ORDER BY created_at DESC;

SELECT TOP (10) event_id, dispute_id, channel, status,
    processed_at, provider_ref, error_code
FROM card_dispute_business_schema.notification_delivery
ORDER BY processed_at DESC;
```

`PUBLISHED` means the broker confirmed publishing; it does **not** by itself prove successful notification delivery. Confirm the receipt in `notification_delivery` and check for unexpected DLQ messages.

## 9. Verified integration and remaining limitations

**Verified in the local POC walkthrough (manual tests):**

1. `GET /actuator/health` returned `HTTP 200` and `{"status":"UP"}` with Spring Boot and Camunda running; Liquibase applied the new notification-worker and outbox migrations.
2. A customer-created dispute was resolved automatically and generated a `DISPUTE_RESOLVED` record in `notification_outbox` with `PENDING` status.
3. With the outbox dispatcher temporarily enabled, Spring Boot connected to RabbitMQ, confirmed the event publication, and marked the outbox record `PUBLISHED`.
4. The main RabbitMQ queue held the persistent message while NestJS was stopped; after restarting the worker, queue metrics returned to `Ready=0`, `Unacked=0`, `Consumers=1`.
5. NestJS authenticated to `POST /internal/v1/notification-receipts`, and SQL Server contained a matching `notification_delivery` record with `DELIVERED` status.
6. Through React/Nginx, an authenticated API request returned transactions; the UI created a dispute (`201 Created`), listed it in **My Disputes**, and the API `Location` header included `localhost:3000`.

**Known limitations and follow-up work:**

- This verifies the **successful local path**, not a reproducible clean-clone test on every teammate's machine. The documented first-run commands still need a fresh-environment smoke test.
- `NOTIFICATION_OUTBOX_ENABLED` is **false by default** in `infra/compose.yaml`. New notification events remain pending until dispatch is deliberately enabled; this is intentional for controlled POC tests.
- NestJS uses an external **NTFY** channel but records the backend channel as `MOCK_EMAIL`; no actual email-delivery claim should be made.
- Failure/retry/DLQ behavior, credential rotation, and restart/recovery scenarios require dedicated tests.
- Nginx's non-root-image warning about its `user` directive does not prevent a successful `nginx -t`, but the configuration can be tidied in a separate change.

The earlier documented backend/worker **callback-contract mismatch has been resolved in the current ZIP**: NestJS posts to `/internal/v1/notification-receipts` using HTTP Basic. See Section 6.1 for the effective Compose variables.

## 10. Shutdown and maintenance

From `infra/`:

```powershell
# Stop application and infrastructure containers, preserving them for later use.
docker compose stop

# Or remove Compose-managed containers/network, retaining named volumes:
docker compose down
```

`docker compose down` **without `-v`** preserves `sqlserver_data` and `rabbitmq_data`. Do not use `down -v` unless you deliberately intend to delete all local database and broker state.

After `docker compose down`, the named volumes are still present. Resume services in the sequence in [Section 3.6](#36-subsequent-startup-with-persistent-volumes); you do not need to reinitialize an unchanged database. Rebuild images only when their source/configuration has changed.

Useful maintenance commands:

```powershell
# From infra/: service status (one-off --rm containers will not appear)
docker compose ps -a

# From infra/: recent application logs
docker compose logs --tail=100 backend
docker compose logs --tail=100 notifications

# From infra/: show/validate effective Compose configuration
docker compose config --quiet

# From backend/: Java regression suite (requires JDK and Maven locally)
mvn clean verify
```

---

**Local POC acceptance evidence:** Spring Boot starts; Liquibase applies the database migrations; Camunda can resolve a dispute; the outbox stores `DISPUTE_RESOLVED`; RabbitMQ confirms publication; NestJS consumes and acknowledges the event; the secured receipt endpoint records it in SQL Server; and React can query and create disputes through the Nginx proxy. The success path was tested manually in one local environment. It is not a substitute for automated integration, failure-path, or clean-clone validation.
