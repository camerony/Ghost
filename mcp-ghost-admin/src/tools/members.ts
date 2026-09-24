import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ghostRequest } from '../client.js';
import { safe, toResult } from '../result.js';

export function registerMemberTools(server: McpServer): void {
  server.registerTool(
    'list_members',
    {
      description: 'Browse members. Supports NQL filter, e.g. "label:vip", "status:paid".',
      inputSchema: {
        filter: z.string().optional(),
        limit: z.number().int().positive().max(100).optional(),
        page: z.number().int().positive().optional(),
        order: z.string().optional(),
      },
    },
    safe(async ({ filter, limit, page, order }) => {
      const data = await ghostRequest({ path: 'members/', query: { filter, limit, page, order } });
      return toResult(data);
    }),
  );

  server.registerTool(
    'get_member',
    {
      description: 'Get a single member by id, including their subscriptions and email activity summary.',
      inputSchema: { id: z.string() },
    },
    safe(async ({ id }) => {
      const data = await ghostRequest({ path: `members/${id}/` });
      return toResult(data);
    }),
  );

  server.registerTool(
    'create_member',
    {
      description: 'Create a member. "fields" may include name, note, labels (array of names), subscribed.',
      inputSchema: {
        email: z.string(),
        fields: z.record(z.string(), z.unknown()).optional(),
      },
    },
    safe(async ({ email, fields }) => {
      const data = await ghostRequest({ method: 'POST', path: 'members/', body: { members: [{ email, ...fields }] } });
      return toResult(data);
    }),
  );

  server.registerTool(
    'update_member',
    {
      description: 'Update a member by id. Only pass the fields you want to change.',
      inputSchema: {
        id: z.string(),
        fields: z.record(z.string(), z.unknown()),
      },
    },
    safe(async ({ id, fields }) => {
      const data = await ghostRequest({ method: 'PUT', path: `members/${id}/`, body: { members: [fields] } });
      return toResult(data);
    }),
  );

  server.registerTool(
    'delete_member',
    {
      description: 'Permanently delete a member by id, cancelling any active paid subscription. This cannot be undone.',
      inputSchema: { id: z.string() },
    },
    safe(async ({ id }) => {
      await ghostRequest({ method: 'DELETE', path: `members/${id}/` });
      return toResult({ deleted: true, id });
    }),
  );
}
