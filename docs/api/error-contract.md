# Error Contract API

Dokumen ini menjelaskan bentuk response error yang diterapkan secara global
pada API.

## Struktur Response

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {},
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/example"
}
```

| Field        | Arti                                                   |
| ------------ | ------------------------------------------------------ |
| `statusCode` | HTTP status aktual yang dikirimkan kepada client       |
| `code`       | Kode stabil dan machine-readable untuk jenis error     |
| `message`    | Pesan aman yang dapat ditampilkan atau diproses client |
| `details`    | Objek berisi detail aman; selalu berupa object         |
| `timestamp`  | Waktu response dalam format ISO-8601 UTC               |
| `path`       | Path request asli yang menghasilkan error              |

Field `requestId` belum tersedia. Field tersebut direncanakan untuk batch
logging dan observability tanpa mengubah field kontrak yang sudah ada.

## Error Code

| Code                 | Penggunaan                                                    |
| -------------------- | ------------------------------------------------------------- |
| `VALIDATION_ERROR`   | DTO atau parameter request gagal divalidasi                   |
| `BAD_REQUEST`        | Request tidak dapat diproses karena input atau bentuk request |
| `UNAUTHENTICATED`    | Authentication dibutuhkan atau tidak valid                    |
| `FORBIDDEN`          | Identitas tidak memiliki izin mengakses resource              |
| `RESOURCE_NOT_FOUND` | Resource atau route tidak ditemukan                           |
| `CONFLICT`           | Request bertentangan dengan state resource                    |
| `TOO_MANY_REQUESTS`  | Batas request terlampaui                                      |
| `INTERNAL_ERROR`     | Terjadi kegagalan yang tidak aman untuk dijelaskan            |

## Validation Error

Validation error diratakan menjadi path field yang deterministik. Nilai input,
target object milik validator, password, dan data sensitif lain tidak
disertakan.

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

Properti request yang tidak didefinisikan dalam DTO juga menghasilkan
`VALIDATION_ERROR`.

## Resource Not Found

Known `NotFoundException` mempertahankan pesan client-safe:

```json
{
  "statusCode": 404,
  "code": "RESOURCE_NOT_FOUND",
  "message": "Resource not found",
  "details": {},
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/projects/example"
}
```

## Internal Error

Unexpected error selalu menggunakan response aman:

```json
{
  "statusCode": 500,
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "details": {},
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/example"
}
```

Stack trace, raw exception, pesan internal, detail database, dan detail
infrastruktur tidak diekspos kepada client.
