# Requirements Traceability Matrix

All entries are planned. None represents completed implementation or evidence.

| ID | Requirement | Planned implementation | Verification evidence | Documentation evidence | Loom evidence | Target batch |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Project CRUD | Protected create, list, detail, update, and delete endpoints | Planned Project unit and E2E tests | Planned API and README references | Planned CRUD demonstration | Batch 5 |
| A2 | Task CRUD | Protected nested Task create, list, detail, update, and delete endpoints | Planned Task unit and E2E tests | Planned API and README references | Planned CRUD demonstration | Batch 6 |
| A3 | Nested Project-Task relation | Nested routes and Project Detail with related Tasks | Planned relation and cross-project access tests | Planned ERD and API documentation | Planned relationship demonstration | Batch 6 |
| A4 | Foreign key and ownership | Project owner foreign key, Task project foreign key, and ownership checks | Planned migration, constraint, and authorization tests | Planned ERD and domain rules | Planned ownership demonstration | Batch 7 |
| B1 | PostgreSQL | PostgreSQL as the SQL persistence store | Planned integration and E2E database tests | Planned setup documentation | Planned persistence demonstration | Batch 3 |
| B2 | TypeORM | Repository-based data access and explicit relation queries | Planned repository and integration tests | Planned architecture documentation | Planned code walkthrough | Batch 3 |
| B3 | Migrations | Versioned schema migrations | Planned clean migration execution | Planned database setup guide | Planned setup reference | Batch 3 |
| B4 | Constraints | Primary, foreign, unique, nullability, and domain constraints | Planned negative integration tests | Planned schema documentation | Planned constraint example | Batch 3 |
| B5 | ERD | User-Project-Task entity relationship diagram | Planned review against migrations | Planned ERD artifact | Planned brief ERD reference | Batch 3 |
| C1 | Registration | Email normalization, password hashing, and user creation | Planned Auth unit and E2E tests | Planned API documentation | Planned registration demonstration | Batch 4 |
| C2 | Login | Credential verification and signed access token response | Planned valid and invalid credential tests | Planned API documentation | Planned login demonstration | Batch 4 |
| C3 | JWT strategy | Verified token identity extraction | Planned strategy tests | Planned authentication documentation | Planned authentication walkthrough | Batch 4 |
| C4 | Guard | JWT guard for protected routes | Planned protected-route tests | Planned authentication documentation | Planned protected endpoint call | Batch 4 |
| C5 | Protected endpoint | Authenticated identity endpoint or protected resource route | Planned valid-token E2E test | Planned API documentation | Planned successful authorized request | Batch 4 |
| D1 | Missing token | Reject absent bearer token | Planned E2E assertion | Planned Auth test notes | Planned concise failure example | Batch 4 |
| D2 | Malformed token | Reject malformed bearer token | Planned E2E assertion | Planned Auth test notes | Planned concise failure example | Batch 4 |
| D3 | Invalid token | Reject invalid signature or unsupported token | Planned E2E assertion | Planned Auth test notes | Planned concise failure example | Batch 4 |
| D4 | Expired token | Reject expired access token | Planned E2E assertion | Planned Auth test notes | Planned concise failure example | Batch 4 |
| D5 | Valid token | Accept a verified, unexpired access token | Planned E2E assertion | Planned Auth test notes | Planned successful request | Batch 4 |
| E1 | Modular Layered Architecture | Feature modules in a modular monolith | Planned dependency review | Planned architecture section | Planned architecture overview | Batch 1 |
| E2 | Controller-Service-Data Access | Controllers handle HTTP, services coordinate use cases, repositories handle persistence | Planned unit boundaries and review | Planned architecture section | Planned code walkthrough | Batch 1 |
| E3 | Dependency Injection | Constructor-injected framework and application dependencies | Planned module compilation and unit tests | Planned architecture section | Planned code walkthrough | Batch 1 |
| F1 | Pattern explanation | Explain responsibilities, dependency direction, benefits, trade-offs, and why a more complex architecture was not selected | Planned documentation review | Planned README architecture section and ADR | Planned architecture summary | Batch 15 |
| G1 | Postman Collection | Runnable mandatory endpoint examples | Planned collection run | Planned collection and usage guide | Planned request demonstration | Batch 11 |
| G2 | Postman Environment | Local variables without committed secrets | Planned environment review and collection run | Planned environment usage guide | Planned environment reference | Batch 11 |
| G3 | Swagger | Additional interactive OpenAPI documentation | Planned schema and endpoint checks | Planned Swagger usage guide | Planned brief documentation view | Batch 11 |
| V1 | Loom demonstration | Camera enabled; strict maximum of five minutes; about 80% mandatory and 20% focused bonus | Planned timing and content rehearsal | Planned demo script | Planned final Loom recording | Batch 17 |
| Q1 | Validation and mass-assignment protection | Strict DTO validation, rejected unknown fields, and protected internal fields | Planned unit and E2E negative tests | Planned API behavior documentation | Planned validation example | Batch 2 |
| Q2 | Serialization | Explicit response models that exclude sensitive fields | Planned serialization tests | Planned response contract documentation | Planned safe response example | Batch 2 |
| Q3 | Error contract | Consistent machine-readable errors without internal details | Planned filter and E2E tests | Planned error reference | Planned error example | Batch 2 |
| Q4 | Authorization and ownership | JWT-derived ownership and not-found behavior for inaccessible resources | Planned cross-user regression tests | Planned security and domain documentation | Planned ownership boundary example | Batch 7 |
| Q5 | N+1 query prevention | Explicit joins or relation loading with bounded query counts | Planned query-count and relation tests | Planned data-access guidance | Planned Project Detail walkthrough | Batch 6 |
| Q6 | Safe E2E lifecycle | Isolated state, ordered cleanup, `await app.close()`, and closed external handles | Planned open-handle and repeat-run checks | Planned test guide | Planned test summary | Batch 3 |
| Q7 | Structured logging | Structured application and HTTP logs with redaction | Planned logging tests and log review | Planned operations documentation | Planned log example | Batch 8 |
| Q8 | Request ID | Propagated or generated request correlation ID | Planned header and log-correlation tests | Planned operations documentation | Planned correlation example | Batch 8 |
| Q9 | HTTP security | Basic secure headers, CORS policy, and safe request limits | Planned HTTP behavior checks | Planned security documentation | Planned brief reference | Batch 8 |
| Q10 | Health and readiness | Separate liveness and dependency-aware readiness endpoints | Planned healthy and degraded-state tests | Planned operations documentation | Planned endpoint demonstration | Batch 9 |
| Q11 | Redis Project Detail cache | User-scoped cache-aside for Project Detail with Tasks, configurable TTL, and SQL fallback | Planned hit, miss, isolation, TTL, and failure tests | Planned cache documentation | Planned cache demonstration | Batch 12 |
| Q12 | Project mutation cache invalidation | Evict Project Detail after successful Project update or delete | Planned success, failure, and rollback tests | Planned cache invariant documentation | Planned invalidation example | Batch 12 |
| Q13 | Task mutation Parent Project cache invalidation | Evict Parent Project Detail after successful Task create, update, or delete | Planned create, update, delete, failure, and rollback tests | Planned cache invariant documentation | Planned child-mutation example | Batch 12 |
| Q14 | Redis cache/BullMQ namespace isolation | Strict cache and BullMQ prefixes isolated by environment, without global flushes | Planned keyspace and cleanup tests | Planned Redis namespace documentation | Planned namespace reference | Batch 13 |
| Q15 | BullMQ Task activity processing | One queue and worker with minimal payloads, bounded retry, backoff, idempotency, retention, and failure logs | Planned producer, worker, retry, and duplicate tests | Planned queue documentation | Planned focused queue demonstration | Batch 13 |
| Q16 | Docker reproducibility | Planned application and dependency containers for repeatable local setup | Planned clean Docker startup | Planned Docker guide | Planned setup reference | Batch 14 |
| Q17 | CI | Lint, type-check, test, build, and migration quality gates | Planned CI run | Planned CI documentation | Planned status reference | Batch 14 |
| Q18 | README and ADR | Accurate setup, architecture, pattern, trade-off, and decision records | Planned documentation consistency review | Planned README and ADR | Planned architecture summary | Batch 15 |
| Q19 | Clean-clone verification | Execute documented setup from a fresh clone without hidden local state | Planned clean-clone run | Planned reproducibility notes | Planned readiness reference | Batch 18 |
| Q20 | Final submission verification | Audit requirements, evidence, links, secrets, repository state, and submission package | Planned final checklist | Planned final audit record | Planned verified Loom link | Batch 18 |
