# Users and Community

Godpowers is at v2.5.0. Stable release.

## Track record

Currently zero recorded production users. Be honest. The 2.5 line adds
executable tier gates on top of the 2.4 UX flow clarity, executable proof path,
accountability hardening, deliverable progress tracking, and three external
CLI-verifiable adoption canaries. Real users will reveal which gaps actually
matter.

- [DECISION] The Phase 2 host proof campaign has selected three current repository slots and completed Slots A and B for local and CI-verifiable host-proof scope.
- [DECISION] Slots A and B do not prove production usage, deployed smoke, or token-dollar accounting because no staging origin or `cost.recorded` events were captured.
- [DECISION] Slot B also keeps Vite dev-tooling modernization explicit because the copied template has 6 High and 4 Moderate dev audit findings with 0 Critical findings.
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
- [Phase 2 Run A local host proof record](docs/case-studies/run-a.md)
- [Phase 2 Run B local host proof record](docs/case-studies/run-b.md)
- [Phase 2 Run C selected slot](docs/case-studies/run-c.md)

- [DECISION] These are not production-user studies.
- [DECISION] They prove first-contact CLI signals against real cloned repositories and two local host-proof records while keeping production-user, deployed-smoke, and cost-accounting gaps explicit.

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
