# Users and Community

Godpowers is at v2.0.1. Stable release.

## Track record

Currently zero recorded production users. Be honest. The 2.0.1 line ships an
executable proof path, but real users will reveal which gaps actually matter.

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

(none yet)

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
