# Delivery Roadmap

All batches describe planned work. Mandatory challenge requirements are
completed before bonus infrastructure in Batches 12 and 13.

## Cross-Batch Invariants

1. Validation, serialization, and the error contract exist before Auth and
   CRUD.
2. Unit and E2E tests are added incrementally with each vertical slice.
3. Every E2E suite closes the application with `await app.close()`.
4. Project-Task relation queries prevent N+1 behavior.
5. Project Detail cache is invalidated by successful Project and Task
   mutations.
6. Cache and BullMQ use isolated Redis namespaces.
7. Mandatory challenge requirements are completed before bonus
   infrastructure.
8. Loom is limited to five minutes, with about 80% for mandatory requirements
   and 20% for focused bonus work.

## Batch 0 – Scope Lock and Requirement Traceability

**Objective:** Fix the challenge boundaries and map each requirement to
evidence.
**Main deliverables:** Scope, domain rules, requirements matrix, roadmap, and a
planning-stage README.
**Quality gate:** Documents agree, links resolve, and no implementation is
claimed.
**Major hidden traps:** Scope creep, premature infrastructure, and wording that
implies unfinished features exist.

## Batch 1 – Bootstrap, Architecture Skeleton, and Configuration

**Objective:** Establish the NestJS modular monolith and strict configuration.
**Main deliverables:** Application bootstrap, feature module boundaries,
Controller-Service-Data Access skeleton, dependency injection, and typed
configuration.
**Quality gate:** The application builds and starts with strict TypeScript.
**Major hidden traps:** Premature abstractions, cyclic dependencies, and
committed secrets.

## Batch 2 – Validation, Serialization, and Error Contract

**Objective:** Establish API boundary behavior before Auth or CRUD.
**Main deliverables:** Runtime validation, rejected unknown properties,
mass-assignment protection, response serialization, and a consistent error
contract.
**Quality gate:** Boundary unit and E2E tests cover invalid and safe responses.
**Major hidden traps:** Entity exposure, silently accepted fields, and leaked
database or stack details.

## Batch 3 – PostgreSQL, TypeORM, ERD, Migration, and Safe Test Harness

**Objective:** Add constrained SQL persistence and an isolated test lifecycle.
**Main deliverables:** PostgreSQL integration, TypeORM entities and
repositories, migrations, constraints, ERD, and E2E database setup.
**Quality gate:** Migrations run cleanly; repeatable E2E suites create and clean
their state, close child records before parents, call `await app.close()`, and
leave no open handles.
**Major hidden traps:** Schema synchronization, shared test state, cleanup
ordering, and `forceExit` masking leaks.

## Batch 4 – Authentication Vertical Slice and Auth E2E

**Objective:** Implement registration, login, verified JWT identity, and a
protected endpoint.
**Main deliverables:** Password hashing, JWT strategy and guard, plus
incremental E2E coverage for missing, malformed, invalid, expired, and valid
tokens.
**Quality gate:** Auth tests pass against the Batch 2 contracts and every suite
closes the app.
**Major hidden traps:** Client-controlled identity, returned hashes, weak token
configuration, and non-deterministic expiry tests.

## Batch 5 – Project CRUD Vertical Slice and Project E2E

**Objective:** Deliver the first complete owned CRUD resource.
**Main deliverables:** Project endpoints, DTOs, service, persistence, and
incremental unit and E2E tests.
**Quality gate:** CRUD behavior, validation, serialization, and owner-scoped
listing pass; every E2E suite closes the app.
**Major hidden traps:** Mass-assigned `ownerId`, unbounded listing, and
cross-user data exposure.

## Batch 6 – Task CRUD, Relationships, Query Efficiency, and Task E2E

**Objective:** Deliver nested Task CRUD and efficient Project-Task queries.
**Main deliverables:** Nested Task endpoints, foreign-key behavior, Project
Detail with Tasks, and incremental relation and E2E tests.
**Quality gate:** Both route IDs are validated, cross-project access fails,
query counts remain bounded, N+1 behavior is absent, and E2E suites close the
app.
**Major hidden traps:** Body-controlled `projectId`, repository calls in loops,
global eager loading, and lost Parent Project IDs.

## Batch 7 – Authorization and Ownership Regression

**Objective:** Prove ownership boundaries across Auth, Project, and Task.
**Main deliverables:** Cross-user and cross-project regression suites and
private-resource not-found behavior.
**Quality gate:** No user can enumerate, read, or mutate another user's
resources.
**Major hidden traps:** Identifier enumeration, inconsistent checks between
list and detail routes, and authorization only at controller level.

## Batch 8 – Structured Logging, Request ID, and HTTP Security

**Objective:** Add bounded operational visibility and baseline HTTP controls.
**Main deliverables:** Structured application and HTTP logs, request ID
correlation, redaction, secure headers, CORS policy, and safe request limits.
**Quality gate:** Correlation and redaction tests pass without changing API
contracts.
**Major hidden traps:** Logging tokens or passwords, duplicate IDs, and
over-broad CORS.

## Batch 9 – Health, Readiness, and Graceful Shutdown

**Objective:** Expose process health and dependency readiness and close
resources predictably.
**Main deliverables:** Liveness, readiness, shutdown hooks, and dependency
cleanup.
**Quality gate:** Healthy, degraded, and shutdown paths are tested.
**Major hidden traps:** Treating liveness as readiness, hanging connections,
and false healthy responses.

## Batch 10 – Regression, Coverage, and Test Quality Gates

**Objective:** Consolidate mandatory behavior without replacing incremental
tests.
**Main deliverables:** Regression suite, meaningful coverage thresholds, and
stable test commands.
**Quality gate:** Tests pass repeatedly without order dependence or open
handles.
**Major hidden traps:** Brittle percentage chasing, duplicated tests, and
`forceExit`.

## Batch 11 – Swagger and Postman Documentation

**Objective:** Make the mandatory API behavior runnable and reviewable.
**Main deliverables:** Swagger, Postman Collection, Postman Environment, and
usage instructions without secrets.
**Quality gate:** Documented examples match validated runtime behavior and the
collection runs successfully.
**Major hidden traps:** Stale schemas, leaked credentials, and undocumented
error cases.

## Batch 12 – Redis Project Detail Cache

**Objective:** Add narrowly scoped cache-aside behavior for Project Detail with
Tasks.
**Main deliverables:** User-scoped keys, configurable TTL, SQL fallback, and
post-success invalidation for Project update/delete and Task
create/update/delete.
**Quality gate:** Hit, miss, isolation, failure, rollback, and all mutation
invalidation tests pass.
**Major hidden traps:** Eviction before commit, missing child invalidation,
cross-user keys, and cache failures breaking SQL operations.

## Batch 13 – BullMQ Task Activity Queue

**Objective:** Add one focused asynchronous Task activity flow.
**Main deliverables:** One queue, one worker, minimal payloads, bounded retries,
explicit backoff, idempotency, retention, and failure logging.
**Quality gate:** Producer and worker tests prove retry and duplicate behavior;
cache and BullMQ keys use isolated environment-specific namespaces.
**Major hidden traps:** Assuming database and enqueue atomicity, sensitive
payloads, unbounded retention, and cleanup that crosses namespaces.

## Batch 14 – Docker, Reproducibility, and CI

**Objective:** Make setup and quality checks repeatable.
**Main deliverables:** Docker-based local environment and CI gates for lint,
type-check, tests, build, and migrations.
**Quality gate:** A clean containerized run and CI workflow succeed.
**Major hidden traps:** Host-only assumptions, startup races, mutable tags, and
CI credentials in the repository.

## Batch 15 – README, Architecture Documentation, and ADR

**Objective:** Explain operation and the selected common project pattern
accurately.
**Main deliverables:** Complete README architecture section and ADR covering
responsibilities, dependency direction, benefits, trade-offs, and why a more
complex architecture was not selected.
**Quality gate:** Documentation matches the repository and verified commands.
**Major hidden traps:** Exaggerated claims, stale commands, and undocumented
trade-offs.

## Batch 16 – Seed, Reset, and Repeatable Demo

**Objective:** Prepare deterministic, non-sensitive demonstration state.
**Main deliverables:** Safe seed and reset procedures and a timed demo script.
**Quality gate:** The demo can be reset and repeated without hidden local
state.
**Major hidden traps:** Real personal data, destructive defaults, and
order-dependent demo steps.

## Batch 17 – Loom Video with a Strict Five-Minute Limit

**Objective:** Record concise evidence with the camera enabled.
**Main deliverables:** A maximum five-minute Loom demonstration allocating
about 80% to mandatory requirements and 20% to focused bonuses.
**Quality gate:** Timing, visibility, audio, camera, and links are verified.
**Major hidden traps:** Exceeding five minutes, overemphasizing bonuses, and
showing secrets or unrelated tooling.

## Batch 18 – Final Audit and Submission Verification

**Objective:** Verify the repository and submission from a reviewer
perspective.
**Main deliverables:** Clean-clone verification, final requirement and evidence
audit, secret scan, link check, and submission checklist.
**Quality gate:** Every claim has implementation, test, documentation, and demo
evidence; no uncommitted submission changes remain.
**Major hidden traps:** Local-only success, broken links, missing evidence, and
claims that exceed the repository state.
