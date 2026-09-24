import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ghostUpload } from '../client.js';
import { safe, toResult } from '../result.js';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function guessMimeType(filename: string): string {
  return MIME_TYPES[extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

export function registerImageTools(server: McpServer): void {
  server.registerTool(
    'upload_image',
    {
      description:
        'Upload an image to Ghost and get back its hosted URL (for use as a feature_image, in post HTML, etc). ' +
        'Provide exactly one of "path" (a file readable by this MCP server\'s process) or "url" (fetched and re-uploaded).',
      inputSchema: {
        path: z.string().optional(),
        url: z.string().optional(),
        purpose: z.enum(['image', 'profile_image', 'icon']).optional().describe('default "image"'),
      },
    },
    safe(async ({ path, url, purpose }) => {
      if (!path && !url) {
        throw new Error('Provide either "path" or "url"');
      }
      let fileBuffer: Buffer;
      let filename: string;
      if (path) {
        fileBuffer = await readFile(path);
        filename = basename(path);
      } else {
        const res = await fetch(url as string);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        }
        fileBuffer = Buffer.from(await res.arrayBuffer());
        filename = basename(new URL(url as string).pathname) || 'image';
      }

      const data = await ghostUpload({
        path: 'images/upload/',
        fileBuffer,
        filename,
        mimeType: guessMimeType(filename),
        fields: purpose ? { purpose } : undefined,
      });
      return toResult(data);
    }),
  );
}
