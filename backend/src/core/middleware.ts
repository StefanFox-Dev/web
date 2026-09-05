import { HttpContext, RouteHandler } from './router';
import { BadRequestError, RateLimitExceededError } from './errors';
import { Logger } from './logger';

export type Middleware = (ctx: HttpContext, next: () => Promise<void>) => Promise<void> | void;

export class MiddlewarePipeline {
  private readonly middlewares: Middleware[] = [];

  public use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  public async execute(ctx: HttpContext, targetHandler: RouteHandler): Promise<void> {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new Error('next() called multiple times in middleware pipeline');
      }
      index = i;

      if (i < this.middlewares.length) {
        const middleware = this.middlewares[i]!;
        await middleware(ctx, () => dispatch(i + 1));
      } else {
        await targetHandler(ctx);
      }
    };

    await dispatch(0);
  }
}

export interface CorsOptions {
  allowOrigin?: string;
  allowMethods?: string[];
  allowHeaders?: string[];
  maxAge?: number;
}

export function createCorsMiddleware(options: CorsOptions = {}): Middleware {
  const origin = options.allowOrigin || '*';
  const methods = (options.allowMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']).join(', ');
  const headers = (options.allowHeaders || ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id', 'X-Admin-Token']).join(', ');
  const maxAge = options.maxAge || 86400;

  return async (ctx, next) => {
    ctx.res.setHeader('Access-Control-Allow-Origin', origin);
    ctx.res.setHeader('Access-Control-Allow-Methods', methods);
    ctx.res.setHeader('Access-Control-Allow-Headers', headers);
    ctx.res.setHeader('Access-Control-Max-Age', maxAge.toString());

    if (ctx.req.method === 'OPTIONS') {
      ctx.empty(204);
      return;
    }

    await next();
  };
}

export function createSecurityHeadersMiddleware(): Middleware {
  return async (ctx, next) => {
    ctx.res.setHeader('X-Content-Type-Options', 'nosniff');
    ctx.res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    ctx.res.setHeader('X-XSS-Protection', '1; mode=block');
    ctx.res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    ctx.res.setHeader('X-DNS-Prefetch-Control', 'off');
    ctx.res.setHeader('X-Download-Options', 'noopen');

    await next();
  };
}

export interface RateLimiterOptions {
  maxTokens: number;
  refillRatePerSec: number;
  windowMs?: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export function createRateLimiterMiddleware(options: RateLimiterOptions): Middleware {
  const buckets = new Map<string, Bucket>();
  const maxTokens = options.maxTokens;
  const refillRate = options.refillRatePerSec;

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > 60000) {
        buckets.delete(ip);
      }
    }
  }, 30000);
  cleanupTimer.unref();

  return async (ctx, next) => {
    const clientIp = (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                     ctx.req.socket.remoteAddress || '127.0.0.1';

    const now = Date.now();
    let bucket = buckets.get(clientIp);

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      buckets.set(clientIp, bucket);
    } else {
      const elapsedSec = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsedSec * refillRate);
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      ctx.res.setHeader('Retry-After', '2');
      throw new RateLimitExceededError('Rate limit exceeded. Please wait.', 2);
    }

    bucket.tokens -= 1;
    ctx.res.setHeader('X-RateLimit-Limit', maxTokens.toString());
    ctx.res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens).toString());

    await next();
  };
}

export function createBodyParserMiddleware(maxSizeBytes = 8 * 1024 * 1024): Middleware {
  return async (ctx, next) => {
    const method = ctx.req.method?.toUpperCase();
    if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
      await next();
      return;
    }

    const contentType = ctx.req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      await next();
      return;
    }

    const bodyBuffer: Buffer[] = [];
    let receivedBytes = 0;

    await new Promise<void>((resolve, reject) => {
      ctx.req.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length;
        if (receivedBytes > maxSizeBytes) {
          ctx.req.destroy();
          reject(new BadRequestError(`Payload Too Large: max allowed is ${maxSizeBytes} bytes`));
          return;
        }
        bodyBuffer.push(chunk);
      });

      ctx.req.on('end', () => {
        if (bodyBuffer.length === 0) {
          ctx.body = {};
          resolve();
          return;
        }

        try {
          const raw = Buffer.concat(bodyBuffer).toString('utf-8');
          ctx.body = JSON.parse(raw);
          resolve();
        } catch {
          reject(new BadRequestError('Malformed JSON payload'));
        }
      });

      ctx.req.on('error', (err) => reject(err));
    });

    await next();
  };
}

export function createRequestLoggerMiddleware(logger: Logger): Middleware {
  return async (ctx, next) => {
    const start = process.hrtime.bigint();
    const method = ctx.req.method || 'GET';
    const url = ctx.req.url || '/';

    ctx.res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      const status = ctx.res.statusCode;

      logger.info(`${method} ${url} -> ${status} (${durationMs.toFixed(2)}ms)`, {
        method,
        url,
        status,
        durationMs: Number(durationMs.toFixed(2)),
        ip: ctx.req.socket.remoteAddress
      }, ctx.requestId);
    });

    await next();
  };
}
