# AGENTS.md

Agent-specific execution guidance for the Ghost monorepo. Human-readable setup,
workflow, architecture, and practice guidance lives in the
[codebase documentation](docs/README.md) and nearby package READMEs.

## This is a personal fork

This checkout is a personal fork for individual use, not the canonical
`TryGhost/Ghost` repository. Two remotes matter:

- `origin` → `camerony/Ghost` (this fork; branches and pushes go here).
- `upstream` → `TryGhost/Ghost` (the official repo; pull only, never push).

To sync with upstream:

```bash
git fetch upstream main
git rebase upstream/main   # or: git merge upstream/main
```

The repo's own `pnpm main:monorepo` / `pnpm main` script already supports a
non-canonical origin: it reads `GHOST_UPSTREAM` (defaulting to `origin`) for
the remote to pull `main` from. Run `GHOST_UPSTREAM=upstream pnpm main` to use
it instead of the manual `git fetch`/rebase above.

The docs under `docs/contributing/` (workflow, shipping) describe the upstream
project's contribution and release process and assume `origin` is
`TryGhost/Ghost` — that assumption does not hold here. Treat their PR/publish
steps as reference material for how upstream works, not as instructions to
follow against this fork.

### Deploying to Dokploy

See [`DOKPLOY.md`](DOKPLOY.md) for the step-by-step deployment guide.
`Dockerfile.dokploy` and `docker-compose.dokploy.yml` are fork-local additions
for self-hosting this instance on Dokploy — they don't exist upstream, so
syncing never conflicts with them. Use `Dockerfile.dokploy`, not the upstream
`Dockerfile.production`, when building a self-contained `full` (server +
Admin UI) image outside CI: `Dockerfile.production`'s `full` target expects
Admin to already be built and injected into the build context at
`ghost/core/core/built/admin` (upstream CI does that in a separate job before
`docker build`); `Dockerfile.dokploy` adds an in-container stage that builds
Admin itself, so a plain `docker build` from a git checkout works. If
`Dockerfile.production`'s stages change upstream, re-diff `Dockerfile.dokploy`
against it and re-apply the admin-build change.

### MCP server for agent control of Ghost

[`camerony/ghost-mcp-admin`](https://github.com/camerony/ghost-mcp-admin) (a
separate repo, not part of this monorepo) wraps a Ghost site's Admin API as
MCP tools — posts, pages, tags, members, image uploads, and a generic
`ghost_admin_request` escape hatch for everything else (tiers, newsletters,
offers, webhooks, users, settings, themes, ...). It originated inside this
fork but was extracted since it has no dependency on this repo's code and is
used across multiple, unrelated Ghost sites — one registered MCP instance per
site, each with its own `GHOST_ADMIN_API_URL`/`GHOST_ADMIN_API_KEY`. Treat
calling its tools as acting on a real, possibly-live site, never as a
codebase-local operation, and don't assume it's pointed at this checkout's
dev server.

Start with:

- [Development setup](docs/contributing/development-setup.md)
- [Contribution workflow](docs/contributing/workflow.md)
- [Writing codebase documentation](docs/contributing/documentation.md)
- [Testing](docs/contributing/testing.md)
- [Shipping](docs/contributing/shipping.md)
- [Codebase direction](docs/codebase/direction.md)
- [Monorepo structure](docs/codebase/monorepo-structure.md)

## Required workflow

- Always use `pnpm`, never npm or Yarn. External dependency versions belong in
  the catalogs in `pnpm-workspace.yaml`; workspace dependencies use
  `workspace:` versions.
- Run `pnpm bootstrap` before other commands in a fresh checkout or worktree.
- Use `pnpm check` as the default full validation command. Browser E2E and Ember
  Admin tests run separately; follow the testing guide.
- Read the nearest `AGENTS.md`, `CLAUDE.md`, and README before changing a package
  or subsystem. More specific guidance overrides this file.
- When committing, load and follow `.agents/skills/commit/SKILL.md`.

## Repository skills

Repository skills live under `.agents/skills/`. When adding one, also add the
matching `.claude/skills/<name>` symlink to
`../../.agents/skills/<name>`. Run `pnpm lint:agent-skills` to verify discovery.

Use the relevant repository skill before adding an Admin API endpoint, database
migration, private feature flag, Shade component, or internal package.

## Task routing and important warnings

- **Admin UI:** read [`apps/admin/README.md`](apps/admin/README.md) and
  [`apps/shade/AGENTS.md`](apps/shade/AGENTS.md). Build new features in React,
  use `admin-x-framework` for APIs, and use Shade for UI. Admin and Core deploy
  independently, so feature-detect backend support and test the older-backend
  case.
- **Embedded Admin CSS:** do not import `@tryghost/shade/styles.css` from an
  embedded app. Admin owns the single Tailwind and Shade CSS lane.
- **Translations:** follow the
  [internationalization guide](docs/practices/internationalization.md). Run the
  extraction command after changing `t()` calls and never split one sentence
  across translation calls.
- **Public apps:** read the app's README and the
  [shipping guide](docs/contributing/shipping.md). Their release and CSS lanes
  differ from Admin.
- **Ghost Core:** use the [server map](docs/codebase/monorepo-structure.md#ghost-core)
  and read the [services guide](ghost/core/core/server/services/README.md) before
  adding a service. New standalone services use TypeScript; keep CommonJS only
  at existing `require()` boundaries. Boot owns service initialization; do not
  initialize on the first request.
- **ESLint:** use the shared factories and dependency rules in the
  [ESLint configuration README](configs/eslint/README.md). A hand-written config
  must declare every plugin it imports locally.
- **Analytics:** start with `pnpm dev:analytics` and follow the nearby Tinybird
  READMEs under `ghost/core/core/server/data/tinybird/`.

Keep shared facts in human documentation. This file should contain only routing,
agent execution constraints, and high-value warnings that prevent recurring
mistakes.
