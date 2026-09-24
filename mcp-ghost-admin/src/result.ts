import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function toResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function toErrorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

/**
 * Wraps a tool handler so a thrown Ghost API error becomes an `isError` tool
 * result (visible to the calling agent as a normal response) instead of an
 * uncaught rejection.
 */
export function safe<Args extends unknown[]>(
  handler: (...args: Args) => Promise<CallToolResult>,
): (...args: Args) => Promise<CallToolResult> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResult(error);
    }
  };
}
