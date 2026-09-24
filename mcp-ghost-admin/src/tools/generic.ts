import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ghostRequest } from '../client.js';
import { safe, toResult } from '../result.js';

export function registerGenericTools(server: McpServer): void {
  server.registerTool(
    'ghost_admin_request',
    {
      description:
        'Call any Ghost Admin API endpoint directly, for resources without a dedicated tool. Path is relative ' +
        'to /ghost/api/admin/ (e.g. "tiers/", "newsletters/", "offers/", "webhooks/", "users/", "settings/", ' +
        '"themes/", "redirects/", "snippets/", "custom_theme_settings/", "integrations/", "roles/", "actions/"). ' +
        'Most list/browse endpoints take filter/limit/page/order query params; write endpoints take a body shaped ' +
        'like { "<resource>": [{ ...fields }] }. Note: an Admin API Key created via a custom Integration (rather ' +
        'than a personal key) is restricted by Ghost itself to a per-resource method allowlist — e.g. it cannot ' +
        'DELETE /db/ or PUT the owner user — so some destructive operations will 403 regardless of what this tool sends.',
      inputSchema: {
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().describe('default GET'),
        path: z.string().describe('e.g. "tiers/" or "webhooks/<id>/"'),
        query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        body: z.unknown().optional(),
      },
    },
    safe(async ({ method, path, query, body }) => {
      const data = await ghostRequest({ method, path, query, body });
      return toResult(data);
    }),
  );

  server.registerTool(
    'get_site',
    {
      description: "Get this Ghost instance's site info (title, description, url, version, icon) — useful to confirm the connection is working.",
      inputSchema: {},
    },
    safe(async () => {
      const data = await ghostRequest({ path: 'site/' });
      return toResult(data);
    }),
  );
}
