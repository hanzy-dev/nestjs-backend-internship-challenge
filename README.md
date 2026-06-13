# NestJS Backend Internship Challenge

Repositori ini berisi fondasi awal untuk Project and Task Management REST API.
Aplikasi saat ini menyediakan bootstrap NestJS, konfigurasi terpusat, validasi
environment, API prefix, serta endpoint metadata sederhana. Fitur bisnis belum
diimplementasikan.

## Status Saat Ini

**Batch 1 - Bootstrap, Architecture Skeleton, and Configuration**

## Ruang Lingkup

Proyek direncanakan sebagai modular monolith dengan dua resource CRUD utama,
yaitu Project dan Task. Batch ini hanya membangun fondasi aplikasi dan tidak
mengimplementasikan domain bisnis.

Teknologi yang sudah tersedia:

- NestJS
- TypeScript
- npm
- centralized configuration melalui `@nestjs/config`
- Joi environment validation
- Jest
- Supertest
- ESLint dan Prettier

PostgreSQL, JWT authentication, Project CRUD, Task CRUD, structured logging,
Redis cache, dan BullMQ queue masih direncanakan untuk batch berikutnya.

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

## Environment Variables

| Variable     | Default       | Keterangan                                              |
| ------------ | ------------- | ------------------------------------------------------- |
| `NODE_ENV`   | `development` | Pilihan: `development`, `test`, atau `production`       |
| `PORT`       | `3000`        | Integer dalam rentang port TCP `1-65535`                |
| `API_PREFIX` | `api/v1`      | Prefix non-empty; slash di awal dan akhir dinormalisasi |

Konfigurasi gagal dimuat lebih awal jika nilainya tidak valid.

## Script npm

| Script                 | Fungsi                                        |
| ---------------------- | --------------------------------------------- |
| `npm run start`        | Menjalankan aplikasi                          |
| `npm run start:dev`    | Menjalankan aplikasi dalam watch mode         |
| `npm run start:debug`  | Menjalankan aplikasi dalam debug watch mode   |
| `npm run start:prod`   | Menjalankan hasil build                       |
| `npm run build`        | Membuat production build                      |
| `npm run typecheck`    | Memeriksa TypeScript tanpa menghasilkan file  |
| `npm run lint`         | Memeriksa source dan test tanpa mengubah file |
| `npm run lint:fix`     | Menerapkan perbaikan lint yang aman           |
| `npm run format`       | Memformat file yang dikelola Prettier         |
| `npm run format:check` | Memeriksa format tanpa mengubah file          |
| `npm run test`         | Menjalankan unit test                         |
| `npm run test:watch`   | Menjalankan unit test dalam watch mode        |
| `npm run test:cov`     | Menjalankan unit test dengan laporan coverage |
| `npm run test:debug`   | Menjalankan unit test dalam debug mode        |
| `npm run test:e2e`     | Menjalankan E2E test                          |

## Struktur Proyek

```text
.
|-- docs/planning/
|-- src/
|   |-- config/
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

- [Scope](docs/planning/scope.md)
- [Domain Rules](docs/planning/domain-rules.md)
- [Requirements Matrix](docs/planning/requirements-matrix.md)
- [Roadmap](docs/planning/roadmap.md)
