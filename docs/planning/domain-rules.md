# Domain Rules

This document defines conceptual rules without prescribing framework-specific
implementation details.

## User Rules

- Email must be unique after normalization.
- Passwords are never stored as plaintext.
- Password hashes are never returned.
- Identity comes from a verified JWT.
- Client input must never determine the authenticated user ID.

## Project Rules

- A Project belongs to exactly one User.
- The owner is taken from the authenticated JWT.
- The client cannot assign or change `ownerId`.
- Only the owner may read or mutate the Project.
- Project listing returns only the authenticated user's Projects.
- Deleting a Project deletes its Tasks.
- Private resources belonging to another user may be returned as not found to
  reduce resource enumeration.

## Task Rules

- A Task belongs to exactly one Project.
- A Task cannot exist without a Project.
- A Task may only be created under a Project owned by the authenticated user.
- `projectId` comes from the route, not freely from the request body.
- Task access must validate both `projectId` and `taskId`.
- A Task from Project A must not be accessible through Project B.
- All Task mutations must preserve the Parent Project ID for downstream cache
  invalidation.

## Relationship and Query Rules

- Project Detail will include related Tasks.
- Related Tasks must be loaded using explicit TypeORM relation loading or
  joins.
- Repository calls inside result loops are forbidden.
- List and detail query counts must remain bounded.
- Global eager loading must not be enabled without a specific reason.
- Only required columns and relationships should be selected.
- The design must prevent N+1 queries.

## Validation and API Rules

- DTOs are separate from persistence entities.
- Unknown request properties are rejected.
- Internal fields are never mass-assigned.
- UUID, enum, date, pagination, and query parameters require runtime
  validation.
- Database and stack-trace details are never exposed to clients.
- Error responses use a consistent machine-readable contract.

## Cache Consistency Invariant

- Project Detail contains the Project and its Tasks.
- Project Detail cache therefore becomes stale when either the Project or any
  child Task changes.
- Project update and delete must evict the Project Detail cache.
- Task create, update, and delete must evict the cache for the related Parent
  Project.
- Cache eviction occurs only after the database mutation succeeds.
- A failed or rolled-back database mutation must not evict the cache.
- Cache failure must be logged, and the primary SQL-backed operation must
  remain usable where safely possible.

## Redis Namespace Isolation Invariant

- Caching and BullMQ may share one Redis instance.
- Cache keys and BullMQ keys must use different strict namespaces.
- The conceptual cache namespace is `application:environment:cache:...`.
- The conceptual BullMQ namespace is `application:environment:bull:...`.
- Development, test, and CI namespaces must be isolated.
- Application and normal test flows must not use `FLUSHALL`.
- Application flows must not use global `FLUSHDB`.
- Cache cleanup must not delete BullMQ keys.
- Queue cleanup must not delete cache keys.
- Separate logical Redis databases may be used as defense in depth, but
  namespace prefixing remains mandatory.

## Queue Rules

- Enqueue occurs only after successful database persistence.
- Queue payloads are minimal identifiers, not entire entities.
- Queue payloads contain no token, password, secret, or sensitive request
  body.
- Retries are bounded.
- Backoff is explicit.
- Activity processing must be idempotent.
- Completed and failed job retention is bounded.
- Database commit and Redis enqueue are not atomically transactional.
- A transactional outbox is documented only as a future improvement.

## Test Lifecycle Invariant

- Every E2E suite uses an isolated test database.
- Tests create their own state.
- Tests do not rely on execution order.
- Child records are cleaned before parent records.
- Every E2E suite closes the Nest application with `await app.close()` in
  `afterAll`.
- Database, Redis, queue, worker, logger, timers, and other handles must be
  closed.
- `forceExit` must not be used to hide dangling connections.
