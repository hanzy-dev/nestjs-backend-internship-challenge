# ADR 0002: PostgreSQL dan TypeORM

## Status

Accepted

## Context

User, Project, dan Task membutuhkan constraint relasional, ownership query,
pagination, migration, serta cascade deletion.

## Decision

Gunakan PostgreSQL sebagai source of truth dan TypeORM dengan migration
eksplisit. Repository khusus menyimpan query dan aplikasi tidak memakai
`synchronize`.

## Consequences

Constraint dan transaksi SQL kuat, tetapi service memerlukan database untuk
operasi inti. Migration harus dijalankan sebagai langkah deployment terpisah.

## Alternatives Considered

- in-memory persistence: tidak memenuhi durability;
- document database: tidak memberi keuntungan untuk relasi saat ini;
- automatic schema synchronization: ditolak karena tidak aman untuk delivery
  terkontrol.
