import jwt from 'jsonwebtoken';

export interface GhostConfig {
  apiUrl: string;
  apiKey: string;
}

/**
 * Ghost's own JWT signing pattern for Admin API Keys (see
 * ghost/core/test/utils/agents/admin-api-test-agent.js in TryGhost/Ghost):
 * HS256, `kid` = key id, secret is hex-encoded and must be decoded to raw
 * bytes before use, 5 minute lifetime, `aud: '/admin/'`.
 */
export function loadConfig(): GhostConfig {
  const apiUrl = process.env.GHOST_ADMIN_API_URL;
  const apiKey = process.env.GHOST_ADMIN_API_KEY;

  if (!apiUrl) {
    throw new Error('GHOST_ADMIN_API_URL is not set (e.g. https://your-site.example)');
  }
  const separatorIndex = apiKey?.indexOf(':') ?? -1;
  if (!apiKey || separatorIndex < 1) {
    throw new Error('GHOST_ADMIN_API_KEY is not set or malformed (expected "id:secret")');
  }

  return { apiUrl: apiUrl.replace(/\/+$/, ''), apiKey };
}

function makeToken(apiKey: string): string {
  const separatorIndex = apiKey.indexOf(':');
  const id = apiKey.slice(0, separatorIndex);
  const secret = apiKey.slice(separatorIndex + 1);

  return jwt.sign({}, Buffer.from(secret, 'hex'), {
    keyid: id,
    algorithm: 'HS256',
    expiresIn: '5m',
    audience: '/admin/',
  });
}

export interface AdminRequestOptions {
  method?: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

function buildUrl(config: GhostConfig, path: string, query?: AdminRequestOptions['query']): URL {
  const url = new URL(`/ghost/api/admin/${path.replace(/^\/+/, '')}`, config.apiUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && Array.isArray((data as { errors?: unknown }).errors)) {
    const errors = (data as { errors: Array<{ message?: string; context?: string }> }).errors;
    return errors.map((error) => error.context ? `${error.message} (${error.context})` : error.message).join('; ');
  }
  return fallback;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function ghostRequest({ method = 'GET', path, query, body }: AdminRequestOptions): Promise<unknown> {
  const config = loadConfig();
  const token = makeToken(config.apiKey);
  const url = buildUrl(config, path, query);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Ghost ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseBody(res);
  if (!res.ok) {
    throw new Error(`Ghost Admin API ${method} ${path} failed (${res.status}): ${extractErrorMessage(data, res.statusText)}`);
  }
  return data;
}

export interface UploadOptions {
  path: string;
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  fields?: Record<string, string>;
}

export async function ghostUpload({ path, fileBuffer, filename, mimeType, fields }: UploadOptions): Promise<unknown> {
  const config = loadConfig();
  const token = makeToken(config.apiKey);
  const url = buildUrl(config, path);

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), filename);
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Ghost ${token}` },
    body: form,
  });

  const data = await parseBody(res);
  if (!res.ok) {
    throw new Error(`Ghost Admin API upload ${path} failed (${res.status}): ${extractErrorMessage(data, res.statusText)}`);
  }
  return data;
}
