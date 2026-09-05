import { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { HttpError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface HttpContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body?: any;
  requestId: string;
  startTime: bigint;
  user?: Record<string, unknown> | undefined;
  json: <T>(data: T, status?: number) => void;
  text: (content: string, status?: number, contentType?: string) => void;
  empty: (status?: number) => void;
  error: (error: HttpError | Error) => void;
}

export type RouteHandler = (ctx: HttpContext) => Promise<void> | void;

interface RouteDefinition {
  method: HttpMethod;
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private readonly routes: RouteDefinition[] = [];

  private compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const normalized = pattern.startsWith('/') ? pattern : `/${pattern}`;
    
    const regexSource = normalized.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexSource}$`);
    return { regex, paramNames };
  }

  public register(method: HttpMethod, pattern: string, handler: RouteHandler): this {
    const { regex, paramNames } = this.compilePattern(pattern);
    this.routes.push({
      method,
      pattern,
      regex,
      paramNames,
      handler
    });
    return this;
  }

  public get(pattern: string, handler: RouteHandler): this {
    return this.register('GET', pattern, handler);
  }

  public post(pattern: string, handler: RouteHandler): this {
    return this.register('POST', pattern, handler);
  }

  public put(pattern: string, handler: RouteHandler): this {
    return this.register('PUT', pattern, handler);
  }

  public delete(pattern: string, handler: RouteHandler): this {
    return this.register('DELETE', pattern, handler);
  }

  public options(pattern: string, handler: RouteHandler): this {
    return this.register('OPTIONS', pattern, handler);
  }

  public match(method: string, pathname: string): { handler: RouteHandler; params: Record<string, string> } | null {
    const cleanPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = cleanPath.match(route.regex);
      if (match) {
        const params: Record<string, string> = {};
        for (let i = 0; i < route.paramNames.length; i++) {
          const name = route.paramNames[i];
          const val = match[i + 1];
          if (name && val !== undefined) {
            params[name] = decodeURIComponent(val);
          }
        }
        return { handler: route.handler, params };
      }
    }

    return null;
  }

  public static parseQuery(url: URL): Record<string, string | string[]> {
    const query: Record<string, string | string[]> = {};
    for (const [key, value] of url.searchParams.entries()) {
      const existing = query[key];
      if (existing === undefined) {
        query[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        query[key] = [existing, value];
      }
    }
    return query;
  }
}
