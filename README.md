# NestJS Backend Internship Challenge

Repositori ini berisi fondasi Project and Task Management REST API. Aplikasi
saat ini menyediakan bootstrap NestJS, konfigurasi terpusat, validasi
environment, API prefix, global runtime validation, safe serialization, serta
error contract yang konsisten. Fitur bisnis belum diimplementasikan.

## Status Saat Ini

**Batch 3 — PostgreSQL, TypeORM, ERD, Migration, and Safe Test Harness**

## Ruang Lingkup

Proyek direncanakan sebagai modular monolith dengan dua resource CRUD utama,
yaitu Project dan Task. Batch ini membangun kontrak API global sebelum
authentication dan CRUD, tanpa mengimplementasikan domain bisnis.

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
- Jest
- Supertest
- ESLint dan Prettier

Registration, login, password hashing, JWT authentication, Project CRUD, Task
CRUD, ownership authorization, structured logging, request ID, Redis cache,
BullMQ queue, Swagger, final Docker application packaging, dan CI masih
direncanakan untuk batch berikutnya.

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

Unit test mencakup konfigurasi environment, metadata aplikasi, formatter
validation error, dan exception mapping. E2E test mencakup endpoint bootstrap,
validasi DTO, penolakan properti asing, nested validation, pemetaan error,
perlindungan detail internal, dan exclusion field sensitif.

```bash
npm test
npm run test:cov
npm run test:e2e
```

Setiap E2E suite membuat Nest application sendiri dan menutupnya dengan
`await app.close()`.

## Environment Variables

| Variable             | Default                 | Keterangan                                                     |
| -------------------- | ----------------------- | -------------------------------------------------------------- |
| `NODE_ENV`           | `development`           | Pilihan: `development`, `test`, atau `production`              |
| `PORT`               | `3000`                  | Integer dalam rentang port TCP `1-65535`                       |
| `API_PREFIX`         | `api/v1`                | Prefix non-empty; slash di awal dan akhir dinormalisasi        |
| `DATABASE_HOST`      | `localhost`             | Host PostgreSQL                                                |
| `DATABASE_PORT`      | `5432`                  | Port PostgreSQL                                                |
| `DATABASE_USER`      | `postgres`              | User lokal PostgreSQL                                          |
| `DATABASE_PASSWORD`  | `postgres`              | Password lokal; jangan digunakan sebagai credential production |
| `DATABASE_NAME`      | `nestjs_challenge`      | Database development                                           |
| `DATABASE_TEST_NAME` | `nestjs_challenge_test` | Database test yang wajib berbeda                               |
| `DATABASE_POOL_MAX`  | `10`                    | Batas pool antara `1-50`                                       |
| `DATABASE_SSL`       | `false`                 | Boolean eksplisit `true` atau `false`                          |

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
- [Database Schema](docs/database/schema.md)
- [Scope](docs/planning/scope.md)
- [Domain Rules](docs/planning/domain-rules.md)
- [Requirements Matrix](docs/planning/requirements-matrix.md)
- [Roadmap](docs/planning/roadmap.md)
