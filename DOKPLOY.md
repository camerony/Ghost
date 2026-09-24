# Deploying to Dokploy

This is the step-by-step guide for deploying this fork on
[Dokploy](https://dokploy.com/). It's fork-local — Dokploy isn't part of
upstream `TryGhost/Ghost` — and pairs with the files it references:

- [`docker-compose.dokploy.yml`](docker-compose.dokploy.yml) — the `ghost` +
  `mysql` services Dokploy deploys.
- [`Dockerfile.dokploy`](Dockerfile.dokploy) — builds Admin in-container (see
  its header comment for why the upstream `Dockerfile.production` can't be
  used directly here).
- [`.env.dokploy.example`](.env.dokploy.example) — the environment variables
  to set in step 3.
- [`AGENTS.md`](AGENTS.md#deploying-to-dokploy) — the short agent-facing
  pointer to this setup.

## Prerequisites

- A running Dokploy instance, with admin access.
- A domain (or subdomain) with its DNS `A`/`AAAA` record pointed at the
  Dokploy server, if you want it publicly reachable at a real URL rather than
  an IP address.
- This repository pushed somewhere Dokploy can pull it from (its own Git
  provider integration, or a plain Git URL it can clone with a deploy key).

## 1. Create the Compose service

In the Dokploy dashboard: **Create Project** (or reuse one) → **Create
Service** → **Compose**.

- **Source**: point it at this repository and the branch you deploy from.
- **Compose file path**: `docker-compose.dokploy.yml`.

Dokploy will build the `ghost` service from `Dockerfile.dokploy`. That build
compiles the whole monorepo plus Admin in-container, so the first build is
slow — 10–20+ minutes is normal. Subsequent builds are faster if Dokploy
caches Docker layers between deploys; a dependency or lockfile change still
forces a full reinstall layer.

## 2. Set environment variables

In the service's **Environment** tab, set the variables listed in
[`.env.dokploy.example`](.env.dokploy.example):

| Variable | Notes |
| --- | --- |
| `GHOST_URL` | Full public URL, including `https://`. Must match the domain you attach in step 4 — Ghost uses this for canonical URLs, sitemaps, and CORS. |
| `MYSQL_ROOT_PASSWORD` | Generate one; only MySQL's own bootstrap uses it. |
| `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | Ghost's database credentials. Defaults for user/database are `ghost`/`ghost`; always set a real password. |
| `MAIL_TRANSPORT`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | Needed for member signup/magic-link emails. Use a real SMTP provider (Mailgun, etc.) — the `Direct` transport is a placeholder and is not reliable in production. |

Generate real passwords (e.g. `openssl rand -hex 24`); don't reuse the
examples from `.env.dokploy.example`.

## 3. First deploy

Trigger the deploy from the dashboard. Watch the build logs — `mysql` should
report healthy first, then `ghost` builds (compile + Admin build) and starts.
Once `ghost`'s healthcheck passes, it's serving on container port `2368`.

## 4. Attach a domain

In the service's **Domains** tab, add your domain and point it at the `ghost`
service, container port `2368`. Dokploy provisions and renews the certificate
(Let's Encrypt) automatically once DNS resolves to the server.

Make sure `GHOST_URL` (step 2) matches this domain exactly, including
`https://`, then redeploy if you changed it after the first deploy.

## 5. First-run setup

Visit `https://<your-domain>/ghost/` — a fresh database opens Ghost's setup
wizard. Create the owner account there; the compose file defines no default
credentials.

## 6. Redeploying

Push to the branch Dokploy is watching (if you enabled auto-deploy on push),
or trigger **Redeploy** from the dashboard. Both rebuild the image from
scratch via `Dockerfile.dokploy` — there's no separate "just restart" fast
path for code changes, only for picking up new environment variable values.

## Persistent data and backups

The compose file defines two named volumes:

- `ghost-content` — themes, images, uploaded member data, and Ghost's local
  settings/state. This is what makes a site a site; back it up.
- `mysql-data` — the database.

Dokploy manages these as Docker volumes on the host. Use Dokploy's volume
backup feature (if configured) or your own `docker run --rm -v
<volume>:/data ...` / `mysqldump` routine — losing either volume without a
backup means losing the site's content or its data respectively.

## Troubleshooting

- **Build fails partway through the `admin-build` stage**: usually a
  workspace install or Nx graph issue unrelated to Dokploy itself — try the
  same build locally first: `docker build -f Dockerfile.dokploy --target full
  -t ghost-dokploy-test .` from the repo root, which reproduces exactly what
  Dokploy runs.
- **`ghost` never reports healthy**: check its logs for a database connection
  error first (wrong `MYSQL_*` values, or `mysql` not yet healthy — `ghost`
  is configured to wait on `mysql`'s healthcheck, but a slow first MySQL
  bootstrap can still race it on underpowered hosts).
- **Emails never arrive**: confirm `MAIL_TRANSPORT`/`MAIL_HOST`/etc. are set
  to a real provider, not left as `Direct`.
