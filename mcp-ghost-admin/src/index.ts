#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './client.js';
import { registerContentTools } from './tools/content.js';
import { registerTagTools } from './tools/tags.js';
import { registerMemberTools } from './tools/members.js';
import { registerImageTools } from './tools/images.js';
import { registerGenericTools } from './tools/generic.js';

// Fail fast with a clear message if the instance isn't configured, rather
// than surfacing a confusing error from the first tool call.
loadConfig();

const server = new McpServer({
  name: 'ghost-mcp-admin',
  version: '0.1.0',
});

registerContentTools(server, 'posts');
registerContentTools(server, 'pages');
registerTagTools(server);
registerMemberTools(server);
registerImageTools(server);
registerGenericTools(server);

await server.connect(new StdioServerTransport());
