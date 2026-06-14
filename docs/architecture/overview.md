# Ikhtisar Arsitektur

## Tujuan Sistem

Aplikasi menyediakan REST API untuk authentication, Project, dan Task dengan
ownership per pengguna. Sistem dibangun sebagai modular monolith agar batas
domain tetap jelas tanpa menambah kompleksitas jaringan, deployment, dan
konsistensi lintas service yang belum diperlukan.

## Komponen dan Batas Modul

```mermaid
flowchart LR
  Client --> HTTP[NestJS HTTP Layer]
  HTTP --> Auth[Auth Module]
  HTTP --> Projects[Projects Module]
  HTTP --> Tasks[Tasks Module]
  HTTP --> Health[Health Module]
  Auth --> Users[Users Module]
  Projects --> DB[(PostgreSQL)]
  Tasks --> DB
  Users --> DB
  Projects --> Cache[(Redis Cache)]
  Tasks --> Cache
  Tasks --> Queue[BullMQ task-activity]
  Queue --> Worker[Activity Worker]
  Cache -. connection boundary .-> RedisInfra[Redis Infrastructure]
  Queue -. namespace boundary .-> RedisInfra
```

- controller menangani transport dan DTO;
- service menangani aturan bisnis, ownership, invalidasi, dan event;
- repository menangani query TypeORM;
- PostgreSQL menjadi source of truth;
- Redis cache dan BullMQ merupakan kemampuan sekunder;
- common layer menangani validation, error, logging, dan request ID.

## Siklus Request HTTP

```mermaid
sequenceDiagram
  participant C as Client
  participant M as Request ID / Helmet / CORS
  participant G as JWT Guard
  participant V as ValidationPipe
  participant Ctrl as Controller
  participant S as Service
  participant R as Repository
  participant DB as PostgreSQL

  C->>M: HTTP request
  M->>G: request + requestId
  G->>V: authenticated user
  V->>Ctrl: validated DTO
  Ctrl->>S: user ID + input
  S->>R: owner-scoped operation
  R->>DB: parameterized query
  DB-->>R: result
  R-->>S: entity/data
  S-->>Ctrl: safe response DTO
  Ctrl-->>C: response + X-Request-ID
```

Global exception filter memetakan error ke kontrak konsisten. Unexpected error
dicatat secara terstruktur tetapi detail internal tidak dikirim ke client.

## Authentication dan Ownership

Login memverifikasi bcrypt hash dan menerbitkan JWT HS256 dengan UUID pengguna
pada claim `sub`. `JwtAuthGuard` mengisi pengguna terautentikasi sebelum
controller berjalan.

Project selalu dicari menggunakan `projectId` dan `ownerId`. Seluruh operasi
Task lebih dahulu memverifikasi Parent Project milik pengguna. Resource yang
tidak ada atau dimiliki pengguna lain sama-sama menghasilkan `404` untuk
mengurangi enumerasi resource privat.

## Relasi Project dan Task

```mermaid
erDiagram
  USERS ||--o{ PROJECTS : owns
  PROJECTS ||--o{ TASKS : contains
  USERS {
    uuid id PK
    varchar email UK
    varchar password_hash
  }
  PROJECTS {
    uuid id PK
    uuid owner_id FK
    varchar name
    varchar status
  }
  TASKS {
    uuid id PK
    uuid project_id FK
    varchar title
    varchar status
    varchar priority
  }
```

Project Detail memakai explicit join dengan Tasks dan urutan deterministik.
Penghapusan Project menghapus Tasks melalui foreign key cascade.

## Validation dan Error Contract

Global `ValidationPipe` menggunakan whitelist, menolak unknown property,
melakukan transformasi DTO eksplisit, dan tidak mengaktifkan implicit
conversion global. Error berisi status, code, message, details aman, timestamp,
path, dan request ID.

## Logging dan Request ID

Pino menghasilkan log JSON dengan request ID, method, route template jika
tersedia, status, duration, user ID aman, dan error code. Authorization,
cookie, password, hash, token, serta credential konfigurasi disensor.

`X-Request-ID` dari client hanya diterima jika bounded dan aman; selain itu
UUID baru dibuat. Nilai yang sama digunakan pada log, header, dan error body.

## Project Detail Cache-Aside

```mermaid
flowchart TD
  A[GET Project Detail] --> K[Build owner-scoped key]
  K --> G{Redis GET}
  G -->|valid hit| R[Return cached safe response]
  G -->|miss/error/malformed| Q[Owner-scoped PostgreSQL join]
  Q --> M[Map safe Project Detail + Tasks]
  M --> S[Redis SET EX TTL]
  S --> O[Return response]
```

Cache hanya membungkus Project Detail. Key menyertakan environment, user ID,
dan project ID. Redis error tidak menggagalkan query PostgreSQL.

## Invalidasi dan Aktivitas Task

Project update/delete serta Task create/update/delete menghapus exact Project
Detail key setelah persistence berhasil.

```mermaid
sequenceDiagram
  participant API as TasksService
  participant DB as PostgreSQL
  participant Cache as Redis Cache
  participant Q as BullMQ Queue
  participant W as Worker

  API->>DB: persist Task
  DB-->>API: committed result
  API->>Cache: DEL exact parent Project key
  opt created or status changed
    API->>Q: add job using eventId
    Q->>W: task-activity job
    W->>W: validate payload
    W-->>W: structured activity log
  end
```

Queue memakai retry maksimum 3, exponential backoff, bounded retention, dan
event ID sebagai job identity.

## Namespace Redis

Cache menggunakan:

```text
<namespace>:<environment>:cache:project:<userId>:<projectId>
```

BullMQ menggunakan option `prefix`:

```text
<namespace>:<environment>:bull
```

Tidak ada `FLUSHALL`, application `FLUSHDB`, wildcard deletion, atau ioredis
`keyPrefix` untuk BullMQ.

## Health dan Shutdown

`/health` memeriksa liveness proses. `/health/ready` memeriksa PostgreSQL
dengan `SELECT 1`. Redis tidak menjadi dependency readiness karena fiturnya
opsional.

Shutdown hook Nest menutup HTTP server, Worker, QueueEvents, Queue, Redis
clients, listener, timer, logger, dan PostgreSQL pool. Test dengan
`--detectOpenHandles` memastikan proses keluar alami.

## Lapisan Pengujian

- unit test: service, mapper, validation, error, logging, dan konfigurasi;
- E2E: Nest + PostgreSQL + HTTP + authentication nyata;
- integration: Redis cache dan BullMQ nyata;
- Swagger E2E: OpenAPI endpoint dan schema;
- Docker smoke: image, migration, health, auth, Project, Task, dan shutdown.

Coverage global lebih rendah daripada service penting karena unit collection
juga memasukkan DTO decorator, Nest module/bootstrap, entity metadata,
migration, dan code yang terutama divalidasi melalui E2E/integration test.
Coverage gate menjaga baseline nyata tanpa mengecualikan business logic.

## Deployment Container

Docker build memakai stage dependency, build, production dependency, dan
runtime. Runtime hanya membawa compiled application dan production packages,
berjalan sebagai user non-root. Migration dijalankan eksplisit melalui service
`migrate`, bukan saat startup aplikasi.

## Trade-off dan Keterbatasan

- modular monolith dipilih untuk delivery sederhana dan transaksi SQL lokal;
- access token belum memiliki refresh-token rotation;
- throttling bersifat in-memory per instance;
- commit PostgreSQL dan enqueue BullMQ tidak atomik;
- transactional outbox dan distributed tracing belum tersedia;
- tidak ada complex RBAC atau production secret manager;
- cache dan queue memperbaiki operasional, tetapi PostgreSQL tetap source of
  truth.
