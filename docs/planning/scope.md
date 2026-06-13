# Project Scope

## Problem Statement

The planned API will help an authenticated user organize projects and the
tasks belonging to those projects.

## Primary User

The system will have one standard authenticated user type. The scope excludes
admin roles, organization roles, complex role-based access control, team
membership, and multi-tenancy.

## Core Resources

### User

User supports registration, login, JWT identity, and resource ownership. User
is not one of the two primary CRUD resources required by the challenge.

### Project

Project is the first complete CRUD resource.

### Task

Task is the second complete CRUD resource.

## Relationships

```text
User 1 --- many Projects
Project 1 --- many Tasks
```

## Required Challenge Scope

The following requirements are mandatory:

1. A NestJS REST API using TypeScript.
2. Two related CRUD resources: Project and Task.
3. SQL persistence using PostgreSQL.
4. JWT API authentication.
5. E2E testing for API token behavior.
6. A commonly used project pattern.
7. An explanation of the selected pattern in GitHub README documentation.
8. API documentation using Postman or an equivalent tool.
9. A Loom demonstration with the camera enabled.

## Quality Scope

The planned engineering-quality requirements are:

- strict TypeScript;
- runtime validation;
- serialization safety;
- a consistent error contract;
- authorization and ownership enforcement;
- database migrations and constraints;
- incremental unit and E2E testing;
- structured logging;
- request ID correlation;
- basic HTTP security;
- health and readiness endpoints;
- Docker-based reproducibility; and
- CI quality gates.

## Focused Bonus Scope

Bonus work begins only after the mandatory challenge requirements are complete.

### Logging

- Structured application and HTTP logging.
- Request ID correlation.
- Sensitive-data redaction.

### Caching

- Redis cache-aside is limited to Project Detail.
- Project Detail includes its related Tasks.
- Cache keys are user-scoped.
- Cache TTL is configurable.
- A safe database fallback remains available.
- Project Detail cache is invalidated after a Project mutation.
- Project Detail cache is invalidated after a related Task mutation.

### Queue

- One BullMQ queue.
- One Task activity worker.
- Bounded retries and explicit backoff.
- Idempotent activity processing.
- Limited completed and failed job retention.
- Failure logging.

## Explicit Non-Goals

- Microservices
- Kafka
- RabbitMQ
- Kubernetes
- Event sourcing
- CQRS
- GraphQL
- WebSocket
- A distributed tracing stack
- Prometheus, Grafana, Loki, or Tempo
- Refresh-token rotation
- Complex RBAC
- Service mesh
- Transactional outbox implementation
- Multiple databases
- Multiple queues or workers

## Scope Protection Rules

- Mandatory challenge requirements are completed before bonus infrastructure.
- No new technology is added without a concrete use case.
- Cache and queue concerns must not dominate the application.
- The project remains a modular monolith.
- Every planned feature must have implementation, test, documentation, and
  demo evidence.
- Claims must match the actual repository state.
