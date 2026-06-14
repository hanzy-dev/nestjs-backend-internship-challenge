# NestJS Backend Internship Challenge

Repositori ini berisi fondasi Project and Task Management REST API. Aplikasi
saat ini menyediakan bootstrap NestJS, konfigurasi terpusat, validasi
environment, API prefix, global runtime validation, safe serialization, error
contract yang konsisten, serta authentication berbasis JWT.

## Status Saat Ini

**Fast-track Batch 5 — Project and Task Management**

## Ruang Lingkup

Proyek direncanakan sebagai modular monolith dengan dua resource CRUD utama,
yaitu Project dan Task. Authentication, Project CRUD, dan Task CRUD nested
sudah tersedia dengan ownership berbasis identitas JWT.

Teknologi yang sudah tersedia:

- NestJS
- TypeScript
- npm
- centralized configuration melalui `@nestjs/config`
- Joi environment validation
- global `ValidationPipe` dengan `class-validator`
- transformasi DTO eksplisit dengan `class-transformer`
- global `ClassSerializerInterceptor`
- global exception filter dan error contract
- registration dan login
- bcrypt password hashing
- JWT access token dan Passport strategy
- protected current-user endpoint
- Project CRUD dengan pagination, filter, dan sorting terbatas
- Task CRUD nested dengan pagination, filter, dan sorting terbatas
- ownership query pada Project dan parent Project
- Project Detail dengan Tasks melalui explicit join
- invalidation boundary no-op untuk Project Detail
- Jest
- Supertest
- ESLint dan Prettier

Structured logging, request ID, HTTP hardening, health/readiness endpoint,
Redis cache, BullMQ queue, Swagger, Postman, final Docker application
packaging, dan CI masih direncanakan untuk batch berikutnya.

## Authentication

| Method | Path                    | Status | Fungsi                                                |
| ------ | ----------------------- | ------ | ----------------------------------------------------- |
| `POST` | `/api/v1/auth/register` | `201`  | Membuat User dengan password yang di-hash             |
| `POST` | `/api/v1/auth/login`    | `200`  | Memverifikasi credential dan menerbitkan access token |
| `GET`  | `/api/v1/auth/me`       | `200`  | Mengambil User saat ini dari Bearer token             |

Email dinormalisasi dengan trim dan lowercase tanpa menghapus titik atau plus
alias. Password di-hash menggunakan bcrypt dengan work factor 10, dibatasi
hingga 72 byte UTF-8, dan tidak pernah disimpan atau dikembalikan sebagai
plaintext.

JWT menggunakan `HS256`, hanya membawa claim `sub` berisi UUID User, dan
diterima melalui:

```text
Authorization: Bearer <access-token>
```

Expiration selalu diverifikasi. Unknown email dan password salah menggunakan
pesan generik yang sama. Refresh token, role, session, dan logout blacklist
belum tersedia.

Detail lengkap tersedia di
[Dokumentasi Authentication](docs/api/authentication.md).

## Project dan Task

Semua endpoint Project dan Task dilindungi JWT. Project selalu dibatasi dengan
`ownerId` dari token terverifikasi. Task hanya diproses setelah Parent Project
terbukti dimiliki User tersebut.

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

List menggunakan pagination database dengan default `page=1`, `limit=20`, dan
maksimum `limit=100`. Filter dan kolom sorting menggunakan whitelist. Project
Detail memuat Tasks melalui satu query dengan explicit join dan urutan
deterministik, sehingga jumlah query tidak bertambah per Task.

Resource yang tidak ada atau dimiliki User lain menghasilkan
`404 RESOURCE_NOT_FOUND`. Penghapusan Project menghapus Tasks melalui foreign
key `ON DELETE CASCADE`.

Project update/delete dan Task create/update/delete memanggil invalidation
boundary setelah persistence berhasil. Implementasi saat ini no-op; belum ada
Redis, cache read, cache write, atau cache key.

Detail lengkap tersedia di
[Dokumentasi Project dan Task](docs/api/projects-and-tasks.md).

## Database

Persistence menggunakan PostgreSQL 17 dan TypeORM. Tiga entity saat ini adalah:

- `UserEntity` untuk tabel `users`;
- `ProjectEntity` untuk tabel `projects`; dan
- `TaskEntity` untuk tabel `tasks`.

Relasi database:

```text
User 1 --- many Projects
Project 1 --- many Tasks
```

Penghapusan User yang masih memiliki Project dibatasi oleh foreign key.
Penghapusan Project menghapus Task anak dengan `ON DELETE CASCADE`. Relation
loading tidak eager atau lazy dan harus dilakukan secara eksplisit.

Detail lengkap tersedia di [Dokumentasi Skema Database](docs/database/schema.md).

## Menjalankan PostgreSQL

Compose ini hanya menjalankan service PostgreSQL untuk development dan test,
bukan application container.

```bash
npm run database:start
npm run database:status
npm run database:logs
npm run database:stop
```

Image PostgreSQL menggunakan major version yang dipin, named volume, dan
health check `pg_isready`. Database test dibuat terpisah saat volume pertama
kali diinisialisasi.

## Migration

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
npm run migration:generate
npm run migration:create
```

TypeORM runtime dan CLI menggunakan builder konfigurasi serta daftar entity
eksplisit yang sama. `synchronize` dan automatic migration startup tidak
diaktifkan.

## Test Database

E2E database menggunakan `DATABASE_TEST_NAME`, bukan `DATABASE_NAME`. Test akan
gagal sebelum cleanup jika nama database test kosong, sama dengan database
development, atau koneksi mengarah ke database yang tidak diharapkan.

Migration dijalankan sebelum suite database. Cleanup dilakukan dalam urutan:

```text
tasks
projects
users
```

Setiap Nest application ditutup dengan `await app.close()`. Test database juga
memastikan DataSource yang dikelola Nest tidak lagi initialized setelah
aplikasi ditutup.

## Prasyarat

- Node.js 22
- npm 11 atau versi kompatibel

Versi mayor Node.js yang digunakan proyek dicatat dalam `.nvmrc`.

## Instalasi

```bash
npm install
```

Buat konfigurasi lokal dari `.env.example` jika diperlukan. Jangan commit file
`.env`.

## Menjalankan Aplikasi

Mode pengembangan:

```bash
npm run start:dev
```

Mode biasa:

```bash
npm run start
```

Build dan menjalankan hasil build:

```bash
npm run build
npm run start:prod
```

## Endpoint Bootstrap

Dengan konfigurasi default:

```text
GET /api/v1
```

Respons:

```json
{
  "name": "NestJS Backend Internship Challenge",
  "status": "Batch 1 - Bootstrap and configuration",
  "version": "v1"
}
```

Endpoint ini hanya memverifikasi bootstrap aplikasi dan tidak mewakili fitur
bisnis.

## Kontrak Validasi

Semua endpoint produksi menggunakan global `ValidationPipe` dengan aturan:

- hanya properti yang didefinisikan DTO yang diterima;
- properti yang tidak dikenal ditolak;
- payload ditransformasikan menjadi instance DTO;
- implicit conversion global tidak diaktifkan;
- konversi tipe harus dinyatakan secara eksplisit pada DTO; dan
- validation error dinormalisasi tanpa menyertakan nilai input atau objek
  internal validator.

Aturan ini membatasi mass assignment dan menghentikan input tidak valid sebelum
controller menjalankan logika aplikasi.

## Serialization

`ClassSerializerInterceptor` diterapkan secara global. Field sensitif dapat
dikecualikan dari response menggunakan decorator serialization seperti
`@Exclude()`. Response sukses tidak dibungkus dalam envelope tambahan.

## Error Contract

Semua error HTTP menggunakan struktur yang konsisten:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "fields": [
      {
        "field": "profile.email",
        "messages": ["email must be an email"]
      }
    ]
  },
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/example"
}
```

Error code awal yang tersedia:

- `VALIDATION_ERROR`
- `BAD_REQUEST`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `CONFLICT`
- `TOO_MANY_REQUESTS`
- `INTERNAL_ERROR`

Unexpected error menggunakan pesan generik dan tidak mengekspos stack trace
atau pesan internal. Penjelasan lengkap tersedia di
[Dokumentasi Error Contract](docs/api/error-contract.md).

## Pengujian

Unit test mencakup 85 skenario untuk fondasi aplikasi, authentication,
pagination, mapper response, query join, Project service, Task service, dan
invalidation ordering. E2E mencakup 60 skenario menggunakan PostgreSQL,
bcrypt, JWT, Passport, TypeORM, migration, ownership, CRUD, filtering,
pagination, sorting, Project Detail, dan cascade deletion yang sebenarnya.

```bash
npm test
npm run test:cov
npm run test:e2e
npm run test:e2e -- --testPathPatterns=auth.e2e-spec.ts
npm run test:e2e -- --testPathPatterns=projects.e2e-spec.ts
npm run test:e2e -- --testPathPatterns=tasks.e2e-spec.ts
npm run test:e2e -- --testPathPatterns=ownership.e2e-spec.ts
```

Setiap E2E suite membuat Nest application sendiri dan menutupnya dengan
`await app.close()`.

## Environment Variables

| Variable                 | Default                 | Keterangan                                                     |
| ------------------------ | ----------------------- | -------------------------------------------------------------- |
| `NODE_ENV`               | `development`           | Pilihan: `development`, `test`, atau `production`              |
| `PORT`                   | `3000`                  | Integer dalam rentang port TCP `1-65535`                       |
| `API_PREFIX`             | `api/v1`                | Prefix non-empty; slash di awal dan akhir dinormalisasi        |
| `DATABASE_HOST`          | `localhost`             | Host PostgreSQL                                                |
| `DATABASE_PORT`          | `5432`                  | Port PostgreSQL                                                |
| `DATABASE_USER`          | `postgres`              | User lokal PostgreSQL                                          |
| `DATABASE_PASSWORD`      | `postgres`              | Password lokal; jangan digunakan sebagai credential production |
| `DATABASE_NAME`          | `nestjs_challenge`      | Database development                                           |
| `DATABASE_TEST_NAME`     | `nestjs_challenge_test` | Database test yang wajib berbeda                               |
| `DATABASE_POOL_MAX`      | `10`                    | Batas pool antara `1-50`                                       |
| `DATABASE_SSL`           | `false`                 | Boolean eksplisit `true` atau `false`                          |
| `JWT_SECRET`             | Tidak ada               | Signing secret minimal 32 karakter; wajib dikonfigurasi        |
| `JWT_EXPIRES_IN_SECONDS` | `900`                   | Masa berlaku access token, maksimum 86400 detik                |

Konfigurasi gagal dimuat lebih awal jika nilainya tidak valid.

## Script npm

| Script                     | Fungsi                                        |
| -------------------------- | --------------------------------------------- |
| `npm run start`            | Menjalankan aplikasi                          |
| `npm run start:dev`        | Menjalankan aplikasi dalam watch mode         |
| `npm run start:debug`      | Menjalankan aplikasi dalam debug watch mode   |
| `npm run start:prod`       | Menjalankan hasil build                       |
| `npm run build`            | Membuat production build                      |
| `npm run typecheck`        | Memeriksa TypeScript tanpa menghasilkan file  |
| `npm run lint`             | Memeriksa source dan test tanpa mengubah file |
| `npm run lint:fix`         | Menerapkan perbaikan lint yang aman           |
| `npm run format`           | Memformat file yang dikelola Prettier         |
| `npm run format:check`     | Memeriksa format tanpa mengubah file          |
| `npm run test`             | Menjalankan unit test                         |
| `npm run test:watch`       | Menjalankan unit test dalam watch mode        |
| `npm run test:cov`         | Menjalankan unit test dengan laporan coverage |
| `npm run test:debug`       | Menjalankan unit test dalam debug mode        |
| `npm run test:e2e`         | Menjalankan E2E test                          |
| `npm run migration:show`   | Menampilkan status migration                  |
| `npm run migration:run`    | Menjalankan migration pending                 |
| `npm run migration:revert` | Membatalkan migration terakhir                |
| `npm run database:start`   | Menjalankan service PostgreSQL                |
| `npm run database:stop`    | Menghentikan service PostgreSQL               |

## Struktur Proyek

```text
.
|-- docs/planning/
|-- docs/api/
|-- docs/database/
|-- src/
|   |-- common/
|   |-- auth/
|   |-- config/
|   |-- database/
|   |-- projects/
|   |-- tasks/
|   |-- users/
|   |-- app.controller.ts
|   |-- app.module.ts
|   |-- app.service.ts
|   |-- app.setup.ts
|   `-- main.ts
|-- test/
|-- .env.example
|-- package.json
`-- tsconfig.json
```

## Dokumen Perencanaan

- [Error Contract](docs/api/error-contract.md)
- [Authentication](docs/api/authentication.md)
- [Project dan Task](docs/api/projects-and-tasks.md)
- [Database Schema](docs/database/schema.md)
- [Scope](docs/planning/scope.md)
- [Domain Rules](docs/planning/domain-rules.md)
- [Requirements Matrix](docs/planning/requirements-matrix.md)
- [Roadmap](docs/planning/roadmap.md)
