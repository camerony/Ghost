# Deploying to Dokploy

This is the step-by-step guide for deploying this fork on
[Dokploy](https://dokploy.com/). It's fork-local — Dokploy isn't part of
upstream `TryGhost/Ghost` — and pairs with the files it references:

- [`docker-compose.dokploy.yml`](docker-compose.dokploy.yml) — the `ghost` +
  `mysql` services Dokploy deploys. `ghost` runs the official
  [`ghost`](https://hub.docker.com/_/ghost) image, pinned to an exact release.
- [`Dockerfile.dokploy`](Dockerfile.dokploy) — not used by the compose file.
  Kept for the case where this fork changes Ghost's own code and needs a
  from-source image (see [Building from source](#building-from-source)).
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

Dokploy pulls the official Ghost image named in the compose file — there's
no build step, so a deploy takes about a minute.

## 2. Set environment variables

In the service's **Environment** tab, set the variables listed in
[`.env.dokploy.example`](.env.dokploy.example):

| Variable | Notes |
| --- | --- |
| `GHOST_URL` | Full public URL, including `https://`. Must match the domain you attach in step 4 — Ghost uses this for canonical URLs, sitemaps, and CORS. |
| `MYSQL_ROOT_PASSWORD` | Generate one. Used by MySQL's first-run bootstrap and by its healthcheck. |
| `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | Ghost's database credentials. Defaults for user/database are `ghost`/`ghost`; always set a real password. |
| `MAIL_TRANSPORT`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | Needed for member signup/magic-link emails. Use a real SMTP provider (Mailgun, etc.) — the `Direct` transport is a placeholder and is not reliable in production. |

Generate real passwords (e.g. `openssl rand -hex 24`); don't reuse the
examples from `.env.dokploy.example`. Avoid `$` in any value — Compose
treats it as variable interpolation.

The `MYSQL_*` values only take effect on the first deploy, when MySQL
initialises an empty `mysql-data` volume. Changing them afterwards doesn't
change the existing database's users or passwords.

## 3. First deploy

Trigger the deploy from the dashboard. Watch the logs — `mysql` should
report healthy first, then `ghost` starts and runs any database migrations.
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

## 6. Upgrading Ghost

The Ghost version is pinned in `docker-compose.dokploy.yml` by tag and
digest (`ghost:<version>-alpine@sha256:...`), so redeploying never upgrades
Ghost by itself. To upgrade:

1. Pick a newer release from the
   [`ghost` tags on Docker Hub](https://hub.docker.com/_/ghost/tags) and get
   its `-alpine` digest.
2. Update the `image:` line, commit, and push (or **Redeploy** from the
   dashboard). Ghost runs its database migrations on start.

Never pin an older version than the one currently deployed: the database
already has that version's migrations, and Ghost doesn't support
downgrading. Back up both volumes before a major-version upgrade.

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

- **`ghost` never reports healthy**: check its logs for a database connection
  error first (wrong `MYSQL_*` values, or `mysql` not yet healthy — `ghost`
  is configured to wait on `mysql`'s healthcheck, but a slow first MySQL
  bootstrap can still race it on underpowered hosts).
- **Emails never arrive**: confirm `MAIL_TRANSPORT`/`MAIL_HOST`/etc. are set
  to a real provider, not left as `Direct`.

## Building from source

This fork has no changes to Ghost's code, so the official image is the same
Ghost. If that changes, [`Dockerfile.dokploy`](Dockerfile.dokploy) builds a
self-contained image from this checkout (server, Admin, and embed renderer,
all built in-container). Swap the `ghost` service's `image:` line for:

```yaml
    build:
      context: .
      dockerfile: Dockerfile.dokploy
      target: full
```

and mount `ghost-content` at `/home/ghost/content` instead of
`/var/lib/ghost/content`. Expect 10–20+ minute builds. The from-source build
tracks upstream `main`, which is usually ahead of the latest official
release — once deployed, you can't switch back to an official image until a
release catches up with it.
