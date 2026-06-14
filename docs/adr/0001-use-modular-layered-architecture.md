# ADR 0001: Modular Layered Architecture

## Status

Accepted

## Context

API memiliki domain Authentication, Users, Projects, dan Tasks yang saling
berhubungan dan perlu dikirim sebagai satu aplikasi pada challenge ini.

## Decision

Gunakan modular monolith NestJS dengan alur Controller → Service → Repository
→ PostgreSQL. Batas modul dan provider token digunakan untuk integrasi cache
dan queue.

## Consequences

Deployment, transaksi, dan debugging tetap sederhana. Disiplin batas modul
tetap diperlukan karena semua kode berjalan dalam satu proses.

## Alternatives Considered

- microservices: ditolak karena menambah network failure dan konsistensi
  terdistribusi tanpa kebutuhan saat ini;
- generic CRUD layer: ditolak karena menyamarkan ownership dan query spesifik.
