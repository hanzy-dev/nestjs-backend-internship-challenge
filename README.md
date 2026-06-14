# NestJS Backend Internship Challenge

Repositori ini berisi REST API modular berbasis NestJS untuk authentication,
Project, dan Task. Implementasi saat ini mencakup fondasi operasional,
hardening HTTP, observability terstruktur, Redis cache-aside untuk Project
Detail, serta satu antrean BullMQ untuk aktivitas Task.

## Status Saat Ini

**Fast-track Batch 6 — Operational Foundation**

## Fitur yang Tersedia

- registration, login, dan JWT access token;
- Project CRUD dan Task CRUD nested dengan ownership;
- pagination, filter, sorting terbatas, dan Project Detail dengan Tasks;
- structured logging berbasis Pino;
- korelasi `X-Request-ID` pada log, response header, dan error body;
- redaction untuk credential, token, cookie, dan field password;
- Helmet, CORS origin eksplisit, serta batas ukuran request body;
- throttling khusus endpoint register dan login;
- liveness dan PostgreSQL readiness endpoint;
- Redis cache-aside untuk Project Detail;
- invalidasi cache tepat setelah mutasi Project dan Task berhasil;
- satu BullMQ queue dan satu worker untuk aktivitas Task;
- namespace Redis terpisah untuk cache dan BullMQ; dan
- graceful shutdown untuk Nest, PostgreSQL, Redis, Queue, Worker, dan
  QueueEvents.

Swagger, Postman Collection, application Docker packaging, CI, seed data, dan
Loom belum diimplementasikan dan tetap menjadi pekerjaan batch berikutnya.

## Endpoint Utama

### Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

Endpoint register dan login memiliki throttling in-memory per instance.
Endpoint CRUD lain tidak menggunakan guard throttling tersebut.

### Project dan Task

```text
POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId

POST   /api/v1/projects/:projectId/tasks
GET    /api/v1/projects/:projectId/tasks
GET    /api/v1/projects/:projectId/tasks/:taskId
PATCH  /api/v1/projects/:projectId/tasks/:taskId
DELETE /api/v1/projects/:projectId/tasks/:taskId
```

Semua endpoint Project dan Task dilindungi JWT. Query ownership menggunakan
identitas User dari token. Resource yang tidak ditemukan atau dimiliki User
lain menghasilkan `404 RESOURCE_NOT_FOUND`.

Detail API tersedia pada
[Dokumentasi Project dan Task](docs/api/projects-and-tasks.md).

### Health

```text
GET /health
GET /health/ready
```

`/health` hanya memeriksa proses aplikasi. `/health/ready` menjalankan query
ringan `SELECT 1` ke PostgreSQL. Keduanya publik dan tidak bergantung pada
status fitur Redis opsional.

## Logging dan Request ID

Log HTTP menggunakan JSON secara default. Pretty output hanya aktif jika
`LOG_PRETTY=true` pada environment `development`. Logging HTTP dinonaktifkan
dalam test agar output tetap bersih.

Setiap request menerima `X-Request-ID`. Nilai dari client diterima hanya jika
berisi 1–128 karakter yang aman (`A-Z`, `a-z`, angka, `.`, `_`, `:`, atau `-`);
nilai lain diganti UUID. ID yang sama tersedia pada response header dan body
error.

Field sensitif seperti authorization header, cookie, password,
`passwordHash`, access token, JWT secret, database password, dan Redis
password disensor oleh konfigurasi Pino.

Penjelasan operasional lengkap tersedia pada
[Panduan Runtime](docs/operations/runtime.md).

## HTTP Security

- Helmet menambahkan security headers.
- CORS hanya menerima origin dari `CORS_ORIGINS`.
- Wildcard CORS ditolak oleh validasi environment.
- JSON dan URL-encoded body menggunakan batas `REQUEST_BODY_LIMIT`.
- Error `413` dinormalisasi menjadi `PAYLOAD_TOO_LARGE`.
- Login dan register menggunakan limit serta TTL yang tervalidasi.

## Redis Project Detail Cache

Cache hanya digunakan untuk:

```text
GET /api/v1/projects/:projectId
```

Key bersifat owner-scoped:

```text
<REDIS_NAMESPACE>:<NODE_ENV>:cache:project:<userId>:<projectId>
```

Alur cache-aside:

```text
Redis get
→ hit: kembalikan Project Detail aman
→ miss/error/data rusak: query PostgreSQL
→ simpan response aman dengan TTL
→ kembalikan response
```

Redis tidak menyimpan entity persistence atau `passwordHash`. Jika Redis tidak
tersedia, core authentication dan CRUD tetap menggunakan PostgreSQL.

Invalidasi hanya menghapus exact owner-scoped Project Detail key setelah:

- Project update;
- Project delete;
- Task create;
- Task update; dan
- Task delete.

Mutasi database yang gagal tidak memicu invalidasi. Kegagalan invalidasi
setelah SQL berhasil hanya dicatat sebagai warning dan tidak membatalkan
mutasi SQL.

## BullMQ Task Activity

Implementasi membuat tepat satu queue dan satu worker:

```text
task-activity
```

Event diproduksi setelah persistence berhasil untuk:

- `TASK_CREATED`; dan
- `TASK_STATUS_CHANGED` hanya ketika status benar-benar berubah.

Payload hanya berisi `eventId`, `eventType`, `userId`, `projectId`, `taskId`,
dan `occurredAt`. `eventId` digunakan sebagai BullMQ job ID untuk mencegah
duplikasi job dengan ID yang sama.

Job menggunakan maksimum 3 attempts, exponential backoff awal 1 detik, serta
retention maksimum 100 completed dan 100 failed jobs. Kegagalan enqueue tidak
membatalkan mutasi SQL yang sudah berhasil. Implementasi ini tidak menggunakan
transactional outbox, sehingga terdapat kemungkinan event hilang setelah
commit SQL tetapi sebelum enqueue berhasil.

BullMQ menggunakan prefix:

```text
<REDIS_NAMESPACE>:<NODE_ENV>:bull
```

Konfigurasi tidak menggunakan ioredis `keyPrefix`.

## Menjalankan Dependency Lokal

PostgreSQL:

```bash
npm run database:start
npm run database:status
npm run database:logs
npm run database:stop
```

Redis:

```bash
npm run redis:start
npm run redis:status
npm run redis:logs
npm run redis:stop
```

Keduanya:

```bash
npm run dependencies:start
npm run dependencies:status
```

`compose.redis.yml` hanya menyediakan Redis lokal yang bind ke `127.0.0.1`.
Repositori belum memiliki application container atau production deployment
claim.

## Instalasi dan Menjalankan Aplikasi

Prasyarat:

- Node.js 22;
- npm 11 atau versi kompatibel;
- PostgreSQL untuk persistence; dan
- Redis hanya jika cache atau queue diaktifkan.

```bash
npm install
npm run start:dev
```

Build production lokal:

```bash
npm run build
npm run start:prod
```

Salin nilai `.env.example` ke konfigurasi lokal dan ganti seluruh credential
development sebelum penggunaan non-lokal. Jangan commit file `.env`.

## Environment Variables

| Variable                    | Default                 | Keterangan                                                |
| --------------------------- | ----------------------- | --------------------------------------------------------- |
| `NODE_ENV`                  | `development`           | `development`, `test`, atau `production`                  |
| `PORT`                      | `3000`                  | Port aplikasi                                             |
| `API_PREFIX`                | `api/v1`                | Prefix endpoint bisnis                                    |
| `DATABASE_HOST`             | `localhost`             | Host PostgreSQL                                           |
| `DATABASE_PORT`             | `5432`                  | Port PostgreSQL                                           |
| `DATABASE_USER`             | `postgres`              | User PostgreSQL lokal                                     |
| `DATABASE_PASSWORD`         | `postgres`              | Password lokal, bukan credential production               |
| `DATABASE_NAME`             | `nestjs_challenge`      | Database development                                      |
| `DATABASE_TEST_NAME`        | `nestjs_challenge_test` | Database test yang wajib berbeda                          |
| `DATABASE_POOL_MAX`         | `10`                    | Batas pool PostgreSQL                                     |
| `DATABASE_SSL`              | `false`                 | Boolean eksplisit                                         |
| `JWT_SECRET`                | wajib                   | Signing secret minimal 32 karakter                        |
| `JWT_EXPIRES_IN_SECONDS`    | `900`                   | Masa berlaku access token                                 |
| `LOG_LEVEL`                 | `info`                  | Level Pino                                                |
| `LOG_PRETTY`                | `false`                 | Pretty log hanya efektif pada development                 |
| `CORS_ORIGINS`              | `http://localhost:3000` | Daftar origin dipisahkan koma                             |
| `REQUEST_BODY_LIMIT`        | `100kb`                 | Batas JSON dan URL-encoded body                           |
| `AUTH_THROTTLE_LIMIT`       | `10`                    | Maksimum request auth dalam window                        |
| `AUTH_THROTTLE_TTL_SECONDS` | `60`                    | Window throttling                                         |
| `REDIS_HOST`                | `localhost`             | Host Redis                                                |
| `REDIS_PORT`                | `6379`                  | Port Redis                                                |
| `REDIS_PASSWORD`            | kosong                  | Hanya boleh kosong untuk Redis lokal yang tidak terekspos |
| `REDIS_TLS`                 | `false`                 | Boolean eksplisit                                         |
| `REDIS_CONNECT_TIMEOUT_MS`  | `2000`                  | Timeout koneksi Redis                                     |
| `REDIS_NAMESPACE`           | `nestjs-challenge`      | Prefix dasar aman; environment ditambahkan otomatis       |
| `CACHE_ENABLED`             | `false`                 | Mengaktifkan Project Detail cache                         |
| `CACHE_TTL_SECONDS`         | `300`                   | TTL Project Detail                                        |
| `QUEUE_ENABLED`             | `false`                 | Mengaktifkan queue dan worker aktivitas Task              |

## Pengujian

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
npm test
npm run test:cov
npm run test:e2e
npm run test:e2e -- --detectOpenHandles
npm run test:integration -- --detectOpenHandles --verbose
```

Unit test mencakup konfigurasi, request ID, logging, health, authentication,
Project, Task, cache invalidation, dan validasi payload aktivitas. E2E
menggunakan PostgreSQL nyata. Integration test cache dan queue menggunakan
Redis nyata serta membersihkan hanya key yang dimiliki suite.

Hasil validasi Batch 6 saat ini adalah 100 unit test, 66 E2E test, dan 8 Redis
integration test.

Setiap Nest E2E application ditutup dengan `await app.close()`. Integration
test juga menutup Redis client, Queue, Worker, QueueEvents, timer observasi,
dan testing module secara deterministik.

## Dokumentasi

- [Authentication](docs/api/authentication.md)
- [Error Contract](docs/api/error-contract.md)
- [Project dan Task](docs/api/projects-and-tasks.md)
- [Runtime dan Operasional](docs/operations/runtime.md)
- [Database Schema](docs/database/schema.md)
- [Scope](docs/planning/scope.md)
- [Domain Rules](docs/planning/domain-rules.md)
- [Requirements Matrix](docs/planning/requirements-matrix.md)
- [Roadmap](docs/planning/roadmap.md)
