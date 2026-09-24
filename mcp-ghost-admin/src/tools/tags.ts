import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ghostRequest } from '../client.js';
import { safe, toResult } from '../result.js';

export function registerTagTools(server: McpServer): void {
  server.registerTool(
    'list_tags',
    {
      description: 'Browse tags. Supports NQL filter, e.g. "visibility:public".',
      inputSchema: {
        filter: z.string().optional(),
        limit: z.number().int().positive().max(100).optional(),
        page: z.number().int().positive().optional(),
      },
    },
    safe(async ({ filter, limit, page }) => {
      const data = await ghostRequest({ path: 'tags/', query: { filter, limit, page } });
      return toResult(data);
    }),
  );

  server.registerTool(
    'create_tag',
    {
      description: 'Create a tag. "fields" may include description, slug, feature_image, visibility, meta_title, meta_description.',
      inputSchema: {
        name: z.string(),
        fields: z.record(z.string(), z.unknown()).optional(),
      },
    },
    safe(async ({ name, fields }) => {
      const data = await ghostRequest({ method: 'POST', path: 'tags/', body: { tags: [{ name, ...fields }] } });
      return toResult(data);
    }),
  );

  server.registerTool(
    'update_tag',
    {
      description: 'Update a tag by id. Only pass the fields you want to change.',
      inputSchema: {
        id: z.string(),
        fields: z.record(z.string(), z.unknown()),
      },
    },
    safe(async ({ id, fields }) => {
      const data = await ghostRequest({ method: 'PUT', path: `tags/${id}/`, body: { tags: [fields] } });
      return toResult(data);
    }),
  );

  server.registerTool(
    'delete_tag',
    {
      description: 'Permanently delete a tag by id. Posts keep their content but lose this tag.',
      inputSchema: { id: z.string() },
    },
    safe(async ({ id }) => {
      await ghostRequest({ method: 'DELETE', path: `tags/${id}/` });
      return toResult({ deleted: true, id });
    }),
  );
}
