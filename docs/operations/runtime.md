# Runtime dan Operasional

Dokumen ini menjelaskan perilaku runtime yang sudah diimplementasikan pada
Fast-track Batch 6. Panduan ini tidak mendeskripsikan Swagger, Postman,
application Docker packaging, CI, seed data, atau deployment production karena
fitur tersebut belum tersedia.

## Structured Logging

Aplikasi menggunakan `nestjs-pino`, `pino`, dan `pino-http`. Format default
adalah JSON. `pino-pretty` hanya digunakan jika:

```text
NODE_ENV=development
LOG_PRETTY=true
```

HTTP logging dinonaktifkan pada `NODE_ENV=test` agar output test tetap
terkendali.

Field korelasi dan HTTP yang ditambahkan atau tersedia pada completion log:

- timestamp Pino;
- level;
- `requestId`;
- method;
- route template, misalnya `/api/v1/projects/:projectId`, jika Express sudah
  menyelesaikan route;
- status code;
- duration dalam `durationMs`;
- authenticated `userId` jika guard sudah mengisi request;
- standardized `errorCode` untuk response error; dan
- object request/response terstruktur dari `pino-http`.

Unexpected error dicatat oleh global exception filter dengan error object,
request ID, dan standardized error code. Client tetap menerima pesan
`INTERNAL_ERROR` generik tanpa stack trace atau detail internal.

## Request ID

Middleware request ID dijalankan sebelum guard, validation pipe, dan
controller. Middleware membaca `X-Request-ID` dan hanya menerima nilai yang
memenuhi pola berikut:

```text
^[A-Za-z0-9._:-]{1,128}$
```

Jika header kosong, terlalu panjang, atau mengandung karakter kontrol/karakter
lain, aplikasi membuat UUID baru. Nilai final:

- disimpan pada typed request;
- dikembalikan melalui response header `X-Request-ID`;
- dimasukkan ke log Pino; dan
- dimasukkan ke setiap body error HTTP sebagai `requestId`.

## Redaction Data Sensitif

Konfigurasi Pino menyensor field berikut dengan nilai `[REDACTED]`:

- `Authorization` header;
- cookie request dan `Set-Cookie` response;
- `password`;
- `passwordHash`;
- `accessToken`;
- `JWT_SECRET`;
- `DATABASE_PASSWORD`; dan
- `REDIS_PASSWORD`.

Request body lengkap tidak dicatat secara eksplisit oleh aplikasi. Payload
aktivitas Task juga tidak membawa JWT, password, hash, request body, atau
header sensitif.

## HTTP Security

Security middleware dan pembatasan runtime:

- Helmet aktif untuk seluruh request;
- CORS menggunakan origin eksplisit dari `CORS_ORIGINS`;
- wildcard `*` ditolak ketika environment divalidasi;
- credential CORS diaktifkan hanya bersama allowlist tersebut;
- JSON dan URL-encoded body dibatasi oleh `REQUEST_BODY_LIMIT`;
- body terlalu besar dinormalisasi menjadi `413 PAYLOAD_TOO_LARGE`; dan
- hanya register dan login yang menggunakan `ThrottlerGuard`.

Throttling menggunakan storage in-memory bawaan Nest per instance. Implementasi
ini bukan distributed rate limiter berbasis Redis.

## Health dan Readiness

Endpoint publik:

```text
GET /health
GET /health/ready
```

`/health` adalah liveness ringan:

```json
{
  "status": "ok"
}
```

`/health/ready` menjalankan `SELECT 1` melalui Nest-managed TypeORM
`DataSource`. Respons sukses:

```json
{
  "status": "ready",
  "database": "up"
}
```

Kegagalan PostgreSQL menghasilkan `503` tanpa membocorkan host, user,
password, atau pesan driver. Redis tidak menjadi dependency readiness karena
cache dan queue bersifat opsional.

## Redis Lokal

`compose.redis.yml` menjalankan satu service Redis dengan image
`redis:7.4-alpine`. Port host hanya bind ke loopback:

```text
127.0.0.1:${REDIS_PORT:-6379}:6379
```

Persistence Redis dinonaktifkan untuk lingkungan lokal ini. Compose tersebut
tidak berisi application container dan bukan konfigurasi deployment
production.

Perintah:

```bash
npm run redis:start
npm run redis:status
npm run redis:logs
npm run redis:stop
```

PostgreSQL dan Redis dapat dimulai bersama:

```bash
npm run dependencies:start
npm run dependencies:status
```

## Redis Connection Boundary

`RedisConnectionManager` hanya membuat client concern yang diaktifkan:

- cache client jika `CACHE_ENABLED=true`;
- queue availability client jika `QUEUE_ENABLED=true`; dan
- tidak membuat client jika kedua flag `false`.

Connection menggunakan bounded connect timeout, `lazyConnect`, offline queue
yang dinonaktifkan, dan retry strategy yang tidak menjadwalkan reconnect tanpa
batas. Acquisition bersifat single-flight sehingga pemanggilan paralel tidak
membuat client duplikat.

Jika Redis tidak tersedia pada startup, manager mencatat warning aman dan
mengembalikan `null`. Core SQL path tetap dapat berjalan.

## Namespace Isolation

Base namespace selalu menyertakan environment:

```text
<REDIS_NAMESPACE>:<NODE_ENV>
```

Contoh development dan test:

```text
nestjs-challenge:development
nestjs-challenge:test
```

Cache Project Detail:

```text
<namespace>:<environment>:cache:project:<userId>:<projectId>
```

BullMQ:

```text
<namespace>:<environment>:bull
```

BullMQ menggunakan option `prefix`, bukan ioredis `keyPrefix`. Cache dan queue
tidak berbagi prefix concern. Aplikasi tidak menjalankan `FLUSHALL`,
application-level `FLUSHDB`, atau wildcard deletion.

## Project Detail Cache-Aside

Cache hanya membungkus:

```text
GET /api/v1/projects/:projectId
```

Endpoint list dan endpoint Task tidak dibaca dari cache.

Alur:

1. Bentuk key dari `userId` dan `projectId`.
2. Baca JSON dari Redis.
3. Jika hit dan payload valid, kembalikan safe `ProjectDetailResponse`.
4. Jika miss, Redis error, atau JSON/cache schema rusak, query PostgreSQL
   dengan owner-scoped explicit join ke Tasks.
5. Map entity ke response aman.
6. Simpan JSON dengan `EX CACHE_TTL_SECONDS`.
7. Kembalikan response.

Cache berisi Project Detail dan Tasks, tetapi tidak berisi owner entity,
password, `passwordHash`, JWT, atau header.

Read, write, dan invalidation error dicatat sebagai warning tanpa
menampilkan credential. Error tersebut tidak dikembalikan sebagai detail
internal ke client.

## Exact Invalidation Rules

Invalidasi dilakukan setelah persistence SQL berhasil:

| Mutasi         | Key yang dihapus                                         |
| -------------- | -------------------------------------------------------- |
| Project update | exact key Project Detail milik owner dan Project terkait |
| Project delete | exact key Project Detail milik owner dan Project terkait |
| Task create    | exact key Parent Project Detail milik owner              |
| Task update    | exact key Parent Project Detail milik owner              |
| Task delete    | exact key Parent Project Detail milik owner              |

Invalidasi menggunakan satu perintah `DEL` terhadap key yang dibangun oleh
`RedisNamespaceService`. Tidak ada penghapusan prefix, scan wildcard, atau
database flush.

Jika persistence gagal, invalidasi dan enqueue tidak dijalankan. Jika
invalidasi gagal setelah persistence berhasil, mutasi SQL tetap sukses dan
kegagalan hanya dicatat.

## BullMQ Task Activity

Nama queue:

```text
task-activity
```

Hanya satu `Queue`, satu `Worker`, dan satu `QueueEvents` dibuat oleh
`TaskActivityService`.

Event:

| Event                 | Kondisi                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `TASK_CREATED`        | Task berhasil disimpan                                           |
| `TASK_STATUS_CHANGED` | Task berhasil disimpan dan status berbeda dari status sebelumnya |

Update title, description, priority, atau due date tanpa perubahan status
tidak menghasilkan job.

Payload minimal:

```json
{
  "eventId": "uuid",
  "eventType": "TASK_CREATED",
  "userId": "uuid",
  "projectId": "uuid",
  "taskId": "uuid",
  "occurredAt": "2026-06-14T00:00:00.000Z"
}
```

Worker memvalidasi seluruh field dan event type sebelum mencatat structured
activity log.

## Retry, Backoff, Retention, dan Idempotency

Default job options:

```text
attempts: 3
backoff: exponential, delay awal 1000 ms
removeOnComplete.count: 100
removeOnFail.count: 100
```

`eventId` digunakan sebagai BullMQ `jobId`. Penambahan event yang sama dengan
ID yang sama tidak membuat dua job aktif/tersimpan untuk queue tersebut.

Worker hanya mencatat aktivitas terstruktur dan tidak mengirim email,
notification, atau menulis activity table.

## Fallback dan Batas Konsistensi

Cache dan queue adalah fitur sekunder:

- cache miss/error beralih ke PostgreSQL;
- cache write/invalidation error tidak membatalkan hasil SQL;
- queue yang dinonaktifkan tidak memengaruhi Task mutation;
- enqueue error dicatat dan tidak membatalkan Task mutation yang sudah
  committed.

Urutan Task mutation:

```text
PostgreSQL persistence
→ exact cache invalidation
→ optional BullMQ enqueue
→ HTTP response
```

Urutan ini tidak atomik. Repositori tidak mengimplementasikan transactional
outbox. Jika proses berhenti setelah commit PostgreSQL tetapi sebelum enqueue
selesai, activity event dapat hilang. Data bisnis PostgreSQL tetap menjadi
source of truth.

## Graceful Shutdown

`main.ts` mengaktifkan Nest shutdown hooks. Saat aplikasi ditutup:

1. Nest berhenti menerima request baru melalui lifecycle server;
2. Worker berhenti dan menunggu job aktif sesuai perilaku `Worker.close()`;
3. QueueEvents ditutup;
4. Queue ditutup;
5. Redis cache dan queue availability clients menjalankan `quit()` jika aman,
   lalu `disconnect()` sebagai fallback;
6. event listener dilepas;
7. reference internal direset;
8. TypeORM menutup PostgreSQL pool melalui lifecycle Nest; dan
9. Nest-managed Pino logger/transport ditutup bersama application context.

Initialization dan shutdown Redis/BullMQ bersifat idempotent. Integration test
memastikan proses Jest kembali secara alami tanpa `forceExit`.

## Pendekatan Testing

Unit test memeriksa:

- environment validation;
- request ID;
- Pino redaction dan HTTP metadata;
- health/readiness mapping;
- cache invalidation ordering;
- queue production conditions; dan
- activity payload validation.

E2E test memakai PostgreSQL nyata dan menutup setiap Nest application dengan
`await app.close()`.

Integration test memakai Redis nyata:

- cache miss, hit, TTL, user isolation, malformed fallback, dan namespace
  cleanup;
- valid worker processing, duplicate job ID, invalid payload logging,
  retry/retention options, dan queue/cache cleanup isolation.

Perintah:

```bash
npm run test:e2e -- --detectOpenHandles
npm run test:integration -- --runInBand --detectOpenHandles --verbose
```

Suite Redis hanya membersihkan exact key atau BullMQ queue yang dibuat suite.
Tidak ada broad Redis flush.
