# API Design

When the system exposes an API or service surface, its contract is an
architectural decision, not an afterthought of the handlers. Settle the style,
the versioning, the contract artifact, the error envelope, and the interaction
safety postures at architecture time; the security module owns API auth and
residue, this module owns the shape of the interface.

## Style and contract

- Declare one API style and apply it consistently: REST, GraphQL, or RPC (gRPC),
  not a different shape per endpoint. Record why; mixing without a reason is a
  smell.
- Model resources and URIs consistently for REST; design the schema first for
  GraphQL. The contract is machine-readable: an OpenAPI document for REST or RPC,
  a GraphQL schema for GraphQL, checked into the repo and kept in sync with the
  routes. A drifted contract is worse than none.
- god-architect owns the contract decision; god-docs-writer keeps the OpenAPI or
  schema document in sync with the code (the documentation profile marks the API
  specification required for API and service forms).

## Versioning and evolution

- Choose a versioning strategy that does not break existing consumers (URI
  version prefix, header negotiation, or GraphQL field deprecation) and state
  it. A breaking change ships behind a new version, never silently.
- Retire old versions on a stated policy; do not leave stale `/v1` mounts with
  weaker auth (that is a security residue the harden pass also flags).

## Errors and payloads

- Use one consistent error envelope across the API: RFC 7807 Problem Details or a
  documented equivalent, not an ad-hoc shape per endpoint. Errors state what
  happened, a stable machine code, and enough for the client to recover.
- Collection endpoints paginate with a stable strategy (cursor or keyset over
  deep offset) and bound page size server-side.

## Interaction safety

- Unsafe operations a client may retry (a POST or PATCH that creates or charges)
  accept and honor an idempotency key so a retry does not double-apply, backed by
  a persisted, unique-constrained key (the database module owns the storage).
- Real-time surfaces (WebSocket, Server-Sent Events) authenticate the connection
  at handshake, authorize each subscription or channel, and bound per-connection
  resource use (message size, rate, backpressure or heartbeat) rather than
  serving an unauthenticated firehose.
- Rate limiting, anti-automation, and hardened outbound clients are the security
  module's; cross-reference rather than restate them.

## Integration patterns

- Choose synchronous versus asynchronous deliberately per interaction; event-
  driven, webhooks, queues (Kafka, RabbitMQ), and API gateways are integration-
  discipline decisions the architecture module already governs. Webhooks are
  signed and verified both directions.
