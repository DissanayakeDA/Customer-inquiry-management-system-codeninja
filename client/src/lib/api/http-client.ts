import { ApiError } from './api-error';

export type QueryParams = Record<string, string | number | null | undefined>;

/**
 * Thin JSON-over-fetch client. Requests go to the same origin (/api/*), which Next.js proxies to
 * the Express API, so the browser sends the httpOnly session cookie automatically.
 */
export class HttpClient {
  constructor(private readonly baseUrl = '/api') {}

  get<T>(path: string, params?: QueryParams): Promise<T> {
    return this.send<T>('GET', withQuery(path, params));
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>('POST', path, body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.send<T>('PATCH', path, body);
  }

  private async send<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
      });
    } catch {
      throw ApiError.network();
    }

    if (!response.ok) throw await ApiError.fromResponse(response);
    if (response.status === 204) return undefined as T;

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(response.status, 'UNEXPECTED_RESPONSE', 'The server sent a response we could not read.');
    }
  }
}

function withQuery(path: string, params?: QueryParams): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
