# System Architecture

## System Context (C4 Level 1)

```
[CI Runner / Engineer Terminal]
              |
              v
         [cilog binary]
              |
              v
         [stdout + exit code]
```

Single-binary CLI. No external services. Reads stdin or file; writes formatted report to stdout.

## Container Diagram (C4 Level 2)

| Container | Single Responsibility | Technology |
|-----------|----------------------|------------|
| `cli` | Argument parsing, file/stdin reading | Go 1.23 (per ADR-001) |
| `parser` | Detect CI format, locate FAILED step | Go (regex + state machine) |
| `formatter` | Render focused report with context | Go (no external lib) |

## Architecture Decision Records

### ADR-001: Go for the implementation
- **Context**: PRD requires static binary, zero runtime deps, multi-platform.
- **Decision**: Go 1.23 with cross-compilation.
- **Rationale**: Single command produces static binaries for macOS/Linux/amd64/arm64. Standard library covers regex and CLI parsing.
- **Flip point**: If we need WebAssembly distribution or per-platform performance optimization, reconsider Rust.
- **Consequences**: Smaller binaries than Rust+tokio; mature CI tooling; standard library covers needs.

### ADR-002: Auto-detection over explicit format flags
- **Context**: Three CI log formats (GitHub Actions, Jenkins, Drone) have distinct markers.
- **Decision**: Sniff the first 100 lines for format markers; fall back to "unknown" with generic FAIL pattern matching.
- **Rationale**: Engineers do not want to specify `--format=jenkins`; tools that "just work" win.
- **Flip point**: When sniffing accuracy drops below 90%, expose a `--format` override.
- **Consequences**: Slightly more startup cost; better UX.

### ADR-003: Streaming parser, not full file load
- **Context**: PRD NFR requires processing 10MB logs in 500ms.
- **Decision**: Line-by-line scanning with bounded ring buffer for context lines.
- **Rationale**: 10MB loaded into memory is fine but streaming generalizes to larger inputs.
- **Flip point**: Never; streaming is strictly superior here.
- **Consequences**: Memory footprint independent of input size.

## NFR-to-Architecture Map

| PRD NFR | Architectural Choice | ADR Reference |
|---------|---------------------|---------------|
| Latency 10MB in 500ms | Streaming parser, no allocations in hot loop | ADR-003 |
| Portability multi-platform | Go cross-compilation matrix in CI | ADR-001 |
| Footprint <5MB | Go static binary with `-ldflags="-s -w"` | ADR-001 |
| Dependencies zero runtime | Go static linking; no shared libs | ADR-001 |

[DECISION] Every NFR from PRD has an architectural choice mapped above.

## Trust Boundaries

```
[stdin / argv]
    |
=== TRUST BOUNDARY: untrusted input; no eval, no shell exec ===
    |
[parser]
    |
[stdout]
```

The tool reads but never executes. Logs may contain malicious content; we
output them verbatim only after format-validating.

## Have-Nots Checklist
- [x] Every container has a clear single responsibility
- [x] Every NFR from PRD has an architectural mapping
- [x] Every ADR has a flip point
- [x] No external services required
