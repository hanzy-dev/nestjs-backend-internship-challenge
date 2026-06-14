# Authentication API

## Ringkasan

Authentication menggunakan User di PostgreSQL, bcrypt untuk password hashing,
dan JWT access token melalui Passport.

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

Refresh token, session, role, logout blacklist, password reset, dan email
verification belum tersedia.

## Registration

Request:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "correct-password"
}
```

`name` di-trim dan dibatasi 2-120 karakter. Email harus valid dan maksimum 254
karakter. Password harus memiliki 8-72 karakter.

Response `201 Created`:

```json
{
  "id": "75b2c04a-0313-4ced-b45c-168080ebc66f",
  "name": "Example User",
  "email": "user@example.com",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

Password dan `passwordHash` tidak dikembalikan. Duplicate normalized email
menghasilkan `409 CONFLICT` dengan pesan `Email is already registered`.

## Normalisasi Email

Registration dan login menghapus whitespace di awal dan akhir serta mengubah
huruf menjadi lowercase. Titik dan plus alias tetap dipertahankan. Tidak ada
aturan khusus provider email.

## Password

Password di-hash menggunakan bcrypt dengan work factor 10 dan dibatasi hingga
72 byte UTF-8 agar tidak terkena truncation bcrypt. Plaintext password tidak
disimpan, dikembalikan, atau dimasukkan ke JWT. Validation error tidak
menyertakan nilai password yang ditolak.

## Login

Response `200 OK`:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "75b2c04a-0313-4ced-b45c-168080ebc66f",
    "name": "Example User",
    "email": "user@example.com",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Unknown email dan password salah menghasilkan response identik:

```json
{
  "statusCode": 401,
  "code": "UNAUTHENTICATED",
  "message": "Invalid email or password",
  "details": {},
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

## JWT Access Token

Payload aplikasi hanya berisi:

```json
{
  "sub": "<user-uuid>"
}
```

Claim expiration ditambahkan oleh `JwtService`. Masa berlaku dikonfigurasi
melalui `JWT_EXPIRES_IN_SECONDS`, dengan default 900 detik. `JWT_SECRET` wajib
memiliki minimal 32 karakter dan tidak mempunyai fallback production.
Signing dan verification dibatasi ke algoritma `HS256`.

Token hanya diterima dari Bearer header:

```text
Authorization: Bearer <access-token>
```

Token dari query parameter atau request body tidak digunakan. Expiration tidak
diabaikan.

## Current User

`GET /api/v1/auth/me` memverifikasi token, mengambil User terbaru berdasarkan
claim `sub`, dan mengembalikan User response yang aman. Token valid untuk User
yang sudah tidak ada menghasilkan `401 UNAUTHENTICATED`.

Missing, malformed, invalidly signed, expired, dan orphaned-user token semuanya
menghasilkan kontrak error `401` tanpa detail internal JWT.

## Keputusan Keamanan

- Database unique constraint menjadi perlindungan akhir email unik.
- Controller tidak mengakses TypeORM, bcrypt, atau JWT signing langsung.
- JWT tidak membawa password, hash, secret, atau entity lengkap.
- Authenticated context hanya berisi `id`, `name`, dan `email`.
- Response dipetakan eksplisit dan tidak mengembalikan relation entity.
- Tidak ada access token permanen atau secret nyata di repository.

## Pengujian

Auth E2E menggunakan PostgreSQL test database, migration, bcrypt, JWT signing,
JWT strategy, dan guard yang sebenarnya. Skenario mencakup registration,
normalisasi dan duplicate email, validation, stored hash, login, JWT subject,
credential error generik, missing/malformed/invalid/expired token, User hilang,
serta `/auth/me`.

Suite menutup aplikasi dengan `await app.close()` dan memastikan DataSource
Nest tidak lagi initialized.
