# ghost-mcp-admin

An MCP (Model Context Protocol) server that gives an AI agent control of this
Ghost instance through its Admin API: posts, pages, tags, members, image
uploads, and a generic escape hatch for everything else Ghost exposes
(tiers, newsletters, offers, webhooks, users, settings, themes, and more).

This is a fork-local addition — it isn't part of the pnpm workspace (see
`../AGENTS.md`'s "Deploying to Dokploy" section for the same pattern applied
to Docker) and isn't upstream in `TryGhost/Ghost`, so it never conflicts when
syncing from upstream.

## Setup

1. In Ghost Admin, go to **Settings → Advanced → Integrations → Add custom
   integration**, name it (e.g. "MCP agent"), and copy its **Admin API Key**
   (`id:secret`).
2. Install and build:

   ```bash
   cd mcp-ghost-admin
   npm install
   npm run build
   ```

3. Register it with your MCP client. For Claude Code:

   ```bash
   claude mcp add ghost-admin \
     --env GHOST_ADMIN_API_URL=https://your-site.example \
     --env GHOST_ADMIN_API_KEY=<id:secret> \
     -- node /absolute/path/to/mcp-ghost-admin/dist/index.js
   ```

   Or add the equivalent block to another client's MCP config, pointing
   `command`/`args` at `node dist/index.js` with those two env vars set.

## Why this isn't `pnpm`

Everything else in this repo uses pnpm workspaces (see the root `AGENTS.md`).
This package is deliberately outside the workspace — it's a personal
automation tool, not part of Ghost's product code — so it uses plain `npm`
to avoid pnpm trying to fold it into the monorepo's workspace graph.

## Tools

| Tool | Resource |
| --- | --- |
| `list_posts`, `get_post`, `create_post`, `update_post`, `delete_post` | Posts |
| `list_pages`, `get_page`, `create_page`, `update_page`, `delete_page` | Pages |
| `list_tags`, `create_tag`, `update_tag`, `delete_tag` | Tags |
| `list_members`, `get_member`, `create_member`, `update_member`, `delete_member` | Members |
| `upload_image` | Image uploads (from a local path or a URL) |
| `get_site` | Site info / connection check |
| `ghost_admin_request` | Any other Admin API endpoint (tiers, newsletters, offers, webhooks, users, settings, themes, redirects, snippets, custom_theme_settings, integrations, roles, actions, ...) |

`create_post`/`update_post` (and the page equivalents) accept a plain `html`
string, which Ghost converts to its native Lexical format on save — you don't
need to construct Lexical JSON by hand unless you want to.

`update_post`/`update_page` auto-fetch the record's current `updated_at`
before writing if you don't supply one, since Ghost rejects an edit whose
`updated_at` doesn't match (its concurrent-edit collision check).

## A note on "full control"

An Admin API Key from a custom Integration (as set up above) is what Ghost
itself restricts less-privileged programmatic access to: it can't run some
destructive whole-site operations (e.g. `DELETE /db/`, transferring
ownership) — those 403 no matter what `ghost_admin_request` sends. That's a
safety property of Ghost's server, not a limitation of this server.
