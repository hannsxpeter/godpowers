# Users and Community

The current source version is v6.1.0, and the latest published release is v6.0.0.

## Track record: the honest version

**Godpowers has zero recorded production users.**

That sentence stays at the top of this page until it is no longer true. A tool
whose entire purpose is refusing to let software claim more than it can prove
does not get to make an exception for its own marketing.

Here is what actually exists today. Godpowers has a large, tested surface: an
optional read-only companion package, executable stage gates, three host-run
proof studies, three externally verifiable adoption canaries against real
third-party repositories, and an accountability system that has been hardened
against its own failure modes. All of that is real and all of it is checked by
tests.

What none of it is: evidence that somebody shipped a product with this and it
worked. Real users are the only thing that reveals which gaps actually matter,
and we do not have them yet.

- [DECISION] The Phase 2 host proof campaign completed Run A for local and CI-verifiable CLI proof, Run B for local web-app proof, and Run C as a blocked-but-documented host proof.
- [DECISION] Slot A does not prove production usage, deployed smoke, or token-dollar accounting because no staging origin or `cost.recorded` events were captured.
- [DECISION] Current evidence and blockers are recorded in [Run A](docs/case-studies/run-a.md), [Run B](docs/case-studies/run-b.md), and [Run C](docs/case-studies/run-c.md).

Note that Run C was blocked and we published it anyway. A case study collection
containing only successes is a marketing brochure, not evidence.

## The proof we actually need

The next credibility milestone is not a bigger command count. It is one real
`/god-mode` run, on a codebase nobody here knows, that produces work which
ships or is genuinely ready to ship.

Before anyone claims a case study, run all three of these and record whether the
shipped fixture suite still passes on the local host:

```bash
npx godpowers quick-proof --project=.
npx godpowers dogfood
node scripts/run-adoption-canary.js <git-url>
```

Then write down all of it, including the parts that went badly:

- The repository shape and project type
- Wall-clock time
- Token and dollar cost from `/god-cost`
- How many times it paused, and why each time
- Assumptions that turned out wrong, and what it took to repair them
- Which validation commands ran, and what they returned
- The host guarantee level from `/god-status`
- Quick proof, dogfood, and adoption canary results
- What actually shipped, or precisely what blocked it

## Using it on something real?

Then you are ahead of us, and we want to hear about it:

1. Open an issue describing what worked and what did not. The second half is
   more useful than the first.
2. Run `/god-extract-learnings` after each milestone, and consider sharing what
   it captured.
3. Tell us about workflows that should exist and do not.

## Where to find us

| Channel | For |
|---|---|
| GitHub Issues | Bug reports and feature requests |
| GitHub Discussions | Questions and sharing experiences |
| Discord | Realtime chat (coming soon) |

## Case studies

**External CLI canaries**, run against real cloned repositories:

- [sindresorhus/is CLI adoption canary](docs/case-studies/sindresorhus-is-adoption-canary.md)
- [expressjs/cors CLI adoption canary](docs/case-studies/expressjs-cors-adoption-canary.md)
- [tinyhttp/tinyhttp CLI adoption canary](docs/case-studies/tinyhttp-adoption-canary.md)

**Host-run proof studies**:

- [Run A slugify-cli Codex host proof](docs/case-studies/run-a.md)
- [Run B Countdown Codex host proof](docs/case-studies/run-b.md)
- [Run C react-github-readme-button blocked host proof](docs/case-studies/run-c.md)

What these do and do not establish:

- [DECISION] The CLI canaries are not production-user studies.
- [DECISION] The CLI canaries prove first-contact CLI signals against real cloned repositories and keep narrow proof limits explicit.
- [DECISION] The Codex host studies are host-run evidence, but they are still not production user adoption.

If you ship something with Godpowers, write it up. We will feature you here.

## Milestones we are watching for

None of these has happened yet. Each one would be a first:

- A production deployment using `/god-mode`
- An incident handled with `/god-hotfix`, followed by `/god-postmortem`
- A completed `/god-upgrade` migration
- A skill pack contributed by the community
- A team using `/god-sprint` to set their cadence
- An external extension pack scaffolded, tested, and published
- A multi-repo suite release dry-run validated against real dependent repos

## Using it alongside other tools

If you have combined Godpowers with another AI coding workflow system, tell us
what worked, where the two collided, and how you resolved it. We document these
patterns in `references/shared/ORCHESTRATORS.md`.

## License

MIT. See LICENSE.

## Code of Conduct

See CONTRIBUTING.md.
