# API Project dan Task

## Ringkasan

Project dan Task menggunakan authentication JWT. Setiap Project dimiliki satu
User, dan setiap Task berada di bawah satu Project.

```text
User 1 --- many Projects
Project 1 --- many Tasks
```

Header untuk seluruh route:

```text
Authorization: Bearer <access-token>
```

## Route Project

| Method   | Path                          | Respons |
| -------- | ----------------------------- | ------- |
| `POST`   | `/api/v1/projects`            | `201`   |
| `GET`    | `/api/v1/projects`            | `200`   |
| `GET`    | `/api/v1/projects/:projectId` | `200`   |
| `PATCH`  | `/api/v1/projects/:projectId` | `200`   |
| `DELETE` | `/api/v1/projects/:projectId` | `204`   |

Field request create dan update:

- `name`: string, 1-160 karakter setelah trim;
- `description`: string opsional 1-2000 karakter, atau `null`;
- `status`: `active`, `completed`, atau `archived`; dan
- `dueDate`: ISO 8601 opsional, atau `null`.

`id`, `ownerId`, timestamp, relation, dan properti lain ditolak. `ownerId`
selalu berasal dari JWT terverifikasi.

Contoh response:

```json
{
  "id": "0b1d3175-100e-4d28-90d0-7c95e333b20d",
  "name": "Backend Challenge",
  "description": "Implementasi REST API",
  "status": "active",
  "dueDate": "2026-07-01T00:00:00.000Z",
  "createdAt": "2026-06-14T00:00:00.000Z",
  "updatedAt": "2026-06-14T00:00:00.000Z"
}
```

Project Detail menambahkan array `tasks` dengan urutan `createdAt`, lalu `id`.

## Route Task

| Method   | Path                                        | Respons |
| -------- | ------------------------------------------- | ------- |
| `POST`   | `/api/v1/projects/:projectId/tasks`         | `201`   |
| `GET`    | `/api/v1/projects/:projectId/tasks`         | `200`   |
| `GET`    | `/api/v1/projects/:projectId/tasks/:taskId` | `200`   |
| `PATCH`  | `/api/v1/projects/:projectId/tasks/:taskId` | `200`   |
| `DELETE` | `/api/v1/projects/:projectId/tasks/:taskId` | `204`   |

Field request create dan update:

- `title`: string, 1-200 karakter setelah trim;
- `description`: string opsional 1-2000 karakter, atau `null`;
- `status`: `todo`, `in_progress`, atau `done`;
- `priority`: `low`, `medium`, atau `high`; dan
- `dueDate`: ISO 8601 opsional, atau `null`.

`projectId` hanya berasal dari route. Body tidak dapat memindahkan Task ke
Project lain.

## Pagination, Filter, dan Sorting

Format list:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

Parameter umum:

- `page`: integer positif, default `1`;
- `limit`: integer `1-100`, default `20`; dan
- `sortOrder`: `asc` atau `desc`.

Project mendukung filter `status` dan sorting `name`, `createdAt`,
`updatedAt`, atau `dueDate`.

Task mendukung filter `status` dan `priority`, serta sorting `title`, `status`,
`priority`, `createdAt`, `updatedAt`, atau `dueDate`.

Kolom sorting dipetakan melalui whitelist internal dan tidak diinterpolasi
langsung dari input ke SQL. `id` menjadi urutan sekunder agar hasil
deterministik.

## Ownership dan Error

Query Project detail dan mutation menggunakan kombinasi `projectId` dan
`ownerId`. Setiap operasi Task terlebih dahulu memverifikasi Parent Project
dengan kombinasi yang sama, lalu query Task menggunakan `taskId` dan
`projectId`.

Project atau Task yang tidak ada, dimiliki User lain, atau diakses melalui
Parent Project yang salah menghasilkan `404 RESOURCE_NOT_FOUND`. Pendekatan ini
mengurangi enumerasi resource privat.

UUID route, enum, tanggal, pagination, sorting, dan body divalidasi. Properti
asing menghasilkan `400 VALIDATION_ERROR`. Token hilang atau tidak valid
menghasilkan `401 UNAUTHENTICATED`.

Response `204 No Content` tidak memiliki JSON body.

## Relasi dan Cascade

Foreign key Task menggunakan `ON DELETE CASCADE`. Setelah Project berhasil
dihapus, seluruh Task anak dihapus oleh PostgreSQL.

## Efisiensi Query

List Project dan Task menggunakan `skip`, `take`, filter, dan ordering pada
database. Ownership menjadi kondisi query, bukan filter setelah data dimuat.

Project Detail menggunakan satu TypeORM QueryBuilder dengan explicit
`LEFT JOIN` ke Tasks. Tidak ada eager relation, lazy `Promise`, repository call
di dalam loop, atau query per Task. Unit test memastikan detail dieksekusi
melalui satu joined query builder.

## Boundary Invalidation

Provider `ProjectDetailCacheInvalidator` menyediakan method:

```text
invalidate(userId, projectId)
```

Project update/delete dan Task create/update/delete memanggil method tersebut
setelah persistence berhasil. Kegagalan persistence tidak memicu invalidation.

Implementasi Batch 5 adalah no-op. Redis, cache key, cache read, dan cache
write belum diimplementasikan.

## Pengujian

Unit test mencakup ownership delegation, response mapper, pagination,
whitelist sorting, joined Project Detail query, CRUD service, dan invalidation
setelah mutation berhasil atau gagal.

E2E menggunakan aplikasi NestJS, PostgreSQL test database, migration,
registration/login/JWT, TypeORM, dan Supertest yang sebenarnya. Suite Project,
Task, dan ownership berdiri sendiri, membersihkan `tasks`, `projects`, lalu
`users`, memanggil `await app.close()`, dan memastikan DataSource tertutup.
