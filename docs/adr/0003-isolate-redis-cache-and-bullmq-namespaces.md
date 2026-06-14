# ADR 0003: Isolasi Namespace Redis dan BullMQ

## Status

Accepted

## Context

Satu Redis lokal digunakan untuk Project Detail cache dan BullMQ. Cleanup atau
invalidasi concern yang salah dapat merusak data concern lain.

## Decision

Cache memakai key builder owner-scoped dengan prefix
`<namespace>:<environment>:cache`. BullMQ memakai option `prefix`
`<namespace>:<environment>:bull`. Tidak gunakan `keyPrefix`, `FLUSHALL`,
application `FLUSHDB`, atau wildcard deletion.

## Consequences

Cache invalidation dan queue cleanup aman serta environment terisolasi.
Implementasi memerlukan disiplin key builder dan test lintas namespace.

## Alternatives Considered

- satu prefix bersama: ditolak karena cleanup berisiko;
- logical Redis database saja: tidak cukup eksplisit dan kurang portabel;
- Redis terpisah per concern: valid untuk skala lebih besar, tetapi berlebihan
  untuk challenge ini.
