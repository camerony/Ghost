import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ghostRequest } from '../client.js';
import { safe, toResult } from '../result.js';

type ContentResource = 'posts' | 'pages';

/**
 * Posts and pages share the same content model and Admin API shape, so one
 * factory registers both resources instead of duplicating five near-identical
 * tools per resource.
 */
export function registerContentTools(server: McpServer, resource: ContentResource): void {
  const singular = resource === 'posts' ? 'post' : 'page';

  server.registerTool(
    `list_${resource}`,
    {
      description: `Browse ${resource} in Ghost. Supports Ghost's NQL filter syntax (e.g. "status:draft", "tag:news", "status:published+visibility:public").`,
      inputSchema: {
        filter: z.string().optional().describe('NQL filter expression'),
        limit: z.number().int().positive().max(100).optional().describe('Results per page (default 15, max 100)'),
        page: z.number().int().positive().optional(),
        order: z.string().optional().describe('e.g. "published_at DESC"'),
        formats: z.string().optional().describe('Comma-separated content formats to include (default "html")'),
      },
    },
    safe(async ({ filter, limit, page, order, formats }) => {
      const data = await ghostRequest({
        path: `${resource}/`,
        query: { filter, limit, page, order, formats: formats ?? 'html' },
      });
      return toResult(data);
    }),
  );

  server.registerTool(
    `get_${singular}`,
    {
      description: `Get a single ${singular} by id or slug (provide exactly one).`,
      inputSchema: {
        id: z.string().optional(),
        slug: z.string().optional(),
        formats: z.string().optional().describe('default "html,lexical"'),
      },
    },
    safe(async ({ id, slug, formats }) => {
      if (!id && !slug) {
        throw new Error(`Provide either id or slug to look up a ${singular}`);
      }
      const path = id ? `${resource}/${id}/` : `${resource}/slug/${slug}/`;
      const data = await ghostRequest({ path, query: { formats: formats ?? 'html,lexical' } });
      return toResult(data);
    }),
  );

  server.registerTool(
    `create_${singular}`,
    {
      description:
        `Create a new ${singular}. Pass "html" for plain HTML content (recommended — Ghost converts it ` +
        `to its native format), or "lexical" for a raw Lexical JSON string. Any other ${singular} attribute ` +
        `Ghost accepts (status, tags, feature_image, published_at, excerpt, visibility, authors, ...) goes ` +
        `in "fields".`,
      inputSchema: {
        title: z.string(),
        html: z.string().optional(),
        lexical: z.string().optional(),
        fields: z.record(z.string(), z.unknown()).optional().describe(`Additional ${singular} attributes`),
      },
    },
    safe(async ({ title, html, lexical, fields }) => {
      const body = {
        [resource]: [{ title, ...(lexical ? { lexical } : {}), ...(html ? { html } : {}), ...fields }],
      };
      const data = await ghostRequest({
        method: 'POST',
        path: `${resource}/`,
        query: { formats: 'html,lexical', ...(html ? { source: 'html' } : {}) },
        body,
      });
      return toResult(data);
    }),
  );

  server.registerTool(
    `update_${singular}`,
    {
      description:
        `Update an existing ${singular} by id. Ghost requires the record's current "updated_at" to detect ` +
        'conflicting concurrent edits — if you omit it, this tool fetches the current value for you first. ' +
        'Only pass the fields you want to change; omitted fields are left as-is.',
      inputSchema: {
        id: z.string(),
        html: z.string().optional(),
        lexical: z.string().optional(),
        fields: z.record(z.string(), z.unknown()).optional(),
      },
    },
    safe(async ({ id, html, lexical, fields }) => {
      let updatedAt = fields?.updated_at as string | undefined;
      if (!updatedAt) {
        const current = (await ghostRequest({ path: `${resource}/${id}/` })) as Record<string, Array<{ updated_at?: string }>>;
        updatedAt = current[resource]?.[0]?.updated_at;
      }
      const body = {
        [resource]: [{ updated_at: updatedAt, ...(lexical ? { lexical } : {}), ...(html ? { html } : {}), ...fields }],
      };
      const data = await ghostRequest({
        method: 'PUT',
        path: `${resource}/${id}/`,
        query: { formats: 'html,lexical', ...(html ? { source: 'html' } : {}) },
        body,
      });
      return toResult(data);
    }),
  );

  server.registerTool(
    `delete_${singular}`,
    {
      description: `Permanently delete a ${singular} by id. This cannot be undone.`,
      inputSchema: { id: z.string() },
    },
    safe(async ({ id }) => {
      await ghostRequest({ method: 'DELETE', path: `${resource}/${id}/` });
      return toResult({ deleted: true, id });
    }),
  );
}
