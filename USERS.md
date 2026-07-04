# Users and Community

Godpowers is at v5.2.0. Stable release.

## Track record

Currently zero recorded production users. Be honest. The 3.0 line makes the
omitted installer profile `core`, adds verb dispatchers for common work, keeps
full-profile compatibility aliases, and preserves `.godpowers/state.json`
authority on top of the optional MCP companion package, executable tier gates,
three Codex host-run proof studies, two Phase 2 blocker fixes, 2.4 UX flow
clarity, executable proof path, accountability hardening, deliverable progress
tracking, and three external CLI-verifiable adoption canaries. Real users will
reveal which gaps actually matter.

- [DECISION] The Phase 2 host proof campaign completed Run A for local and CI-verifiable CLI proof, Run B for local web-app proof, and Run C as a blocked-but-documented host proof.
- [DECISION] Slot A does not prove production usage, deployed smoke, or token-dollar accounting because no staging origin or `cost.recorded` events were captured.
- [DECISION] Current evidence and blockers are recorded in [Run A](docs/case-studies/run-a.md), [Run B](docs/case-studies/run-b.md), and [Run C](docs/case-studies/run-c.md).

## Proof needed during freeze

The next credibility milestone is not another command count increase. It is a
real `/god-mode` run on an unfamiliar codebase that produces shipped or
ship-ready work.

Before claiming a case study, also run `npx godpowers quick-proof --project=.`,
`npx godpowers dogfood`, and the adoption canary harness. Record whether the
shipped fixture suite still passes on the local host.

When that happens, record:
- Repository shape and project type
- Wall-clock time
- Token and dollar cost from `/god-cost`
- Number of pauses and why they happened
- Failed assumptions or repairs
- Validation commands and results
- Host guarantee level from `/god-status` or `godpowers status --brief`
- Quick proof result from `npx godpowers quick-proof --project=.`
- Dogfood result from `npx godpowers dogfood`
- Adoption canary result from `node scripts/run-adoption-canary.js <git-url>`
- What actually shipped, or what blocked shipment

## Adopt carefully

If you use Godpowers on a real project:

1. Open an issue with what worked and what didn't
2. Run `/god-extract-learnings` after each milestone and consider sharing
3. Tell us about workflows that should exist but don't

## Channels

- **GitHub Issues**: bug reports, feature requests
- **GitHub Discussions**: questions, sharing experiences
- **Discord**: realtime chat (coming soon)

## Case studies

- [sindresorhus/is CLI adoption canary](docs/case-studies/sindresorhus-is-adoption-canary.md)
- [expressjs/cors CLI adoption canary](docs/case-studies/expressjs-cors-adoption-canary.md)
- [tinyhttp/tinyhttp CLI adoption canary](docs/case-studies/tinyhttp-adoption-canary.md)
- [Run A slugify-cli Codex host proof](docs/case-studies/run-a.md)
- [Run B Countdown Codex host proof](docs/case-studies/run-b.md)
- [Run C react-github-readme-button blocked host proof](docs/case-studies/run-c.md)

- [DECISION] The CLI canaries are not production-user studies.
- [DECISION] The CLI canaries prove first-contact CLI signals against real cloned repositories and keep narrow proof limits explicit.
- [DECISION] The Codex host studies are host-run evidence, but they are still not production user adoption.

If you ship something with Godpowers, write it up. We'll feature you here.

## Adoption signals we want

- First production deployment using `/god-mode`
- First incident handled via `/god-hotfix` followed by `/god-postmortem`
- First /god-upgrade migration completed
- First skill pack contributed by the community
- First team using `/god-sprint` for cadence
- First external extension pack scaffolded, tested, and published
- First Mode D suite release dry-run validated against real dependent repos

## Composability stories

If you've combined Godpowers with another AI coding workflow system,
tell us:
- What worked
- Where you hit conflicts
- How you resolved them

We document these patterns in `references/shared/ORCHESTRATORS.md`.

## License

MIT. See LICENSE.

## Code of Conduct

See CONTRIBUTING.md.
