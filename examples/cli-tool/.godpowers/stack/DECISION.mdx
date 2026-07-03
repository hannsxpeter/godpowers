# Stack Decision

## Selected Stack

| Concern | Choice | Lock-in level |
|---------|--------|---------------|
| Language | Go 1.23 | Medium |
| Build | `go build -ldflags="-s -w"` static binary | Low |
| Tests | Go standard `testing` package | Low |
| Distribution | Homebrew (own tap) + npm + GitHub Releases | Low |
| CI | GitHub Actions matrix build | Medium |
| Linter | golangci-lint | Low |

## Decisions

### S-language: Go 1.23
- [DECISION] Per ADR-001 in ARCH.md
- **Flip point**: If we need WebAssembly or per-platform optimization, reconsider Rust
- **Lock-in cost**: Rewrite would take 2-3 weeks given the small surface area

### S-build: Static binary with debug strip
- [DECISION] `-ldflags="-s -w"` removes symbol table and debug info; meets <5MB target
- **Flip point**: If we ship signed binaries (requires retaining symbols), revisit

### S-distribution: Homebrew + npm + GitHub Releases
- [DECISION] Three channels match how DevOps engineers install tools
- **Flip point**: If brew users dwarf others, drop npm to reduce maintenance
- **Pairs with**: GitHub Actions matrix build (one source, multiple outputs)

### S-tests: Standard Go testing
- [DECISION] No external test framework; standard package is sufficient
- **Flip point**: If we need property-based testing, add `gopter`
- **Pairs with**: Go (no integration overhead)

## Pairing compatibility verified

[DECISION] Go + GitHub Actions: native first-class support.
[DECISION] Go binaries + Homebrew formula: standard pattern.
[DECISION] Go + npm: requires postinstall script to download platform binary; pattern is well-established.

## Have-Nots Checklist
- [x] Every selection has a rationale and flip point
- [x] No untyped or unscoped "TBD" choices
- [x] Pairing compatibility verified
