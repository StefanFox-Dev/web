import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { Router, HttpContext } from './router';
import { MiddlewarePipeline } from './middleware';
import { HttpError, NotFoundError, ProblemDetails } from './errors';
import { Logger } from './logger';

export interface HttpServerConfig {
  port: number;
  host?: string;
  enableGracefulShutdown?: boolean;
}

export type FallbackHandler = (ctx: HttpContext, pathname: string) => Promise<void> | void;

export class HttpServer {
  private readonly server: Server;
  private readonly router: Router;
  private readonly pipeline: MiddlewarePipeline;
  private readonly logger: Logger;
  private readonly config: HttpServerConfig;
  private fallbackHandler: FallbackHandler | null = null;

  constructor(
    config: HttpServerConfig,
    router: Router,
    pipeline: MiddlewarePipeline,
    logger: Logger
  ) {
    this.config = { host: '0.0.0.0', ...config };
    this.router = router;
    this.pipeline = pipeline;
    this.logger = logger.child('HttpServer');
    this.server = createServer((req, res) => this.handleRequest(req, res));

    if (this.config.enableGracefulShutdown !== false) {
      this.setupGracefulShutdown();
    }
  }

  public setFallbackHandler(handler: FallbackHandler): this {
    this.fallbackHandler = handler;
    return this;
  }

  public getRawServer(): Server {
    return this.server;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('X-Request-Id', requestId);

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `localhost:${this.config.port}`;
    const parsedUrl = new URL(req.url || '/', `${protocol}://${host}`);

    const ctx: HttpContext = {
      req,
      res,
      params: {},
      query: Router.parseQuery(parsedUrl),
      requestId,
      startTime: process.hrtime.bigint(),
      json: <T>(data: T, status = 200) => {
        if (res.writableEnded) return;
        const payload = JSON.stringify(data);
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(payload));
        res.end(payload);
      },
      text: (content: string, status = 200, contentType = 'text/plain; charset=utf-8') => {
        if (res.writableEnded) return;
        res.statusCode = status;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', Buffer.byteLength(content));
        res.end(content);
      },
      empty: (status = 204) => {
        if (res.writableEnded) return;
        res.statusCode = status;
        res.end();
      },
      error: (err: HttpError | Error) => {
        this.sendErrorResponse(res, err, parsedUrl.pathname, requestId);
      }
    };

    try {
      await this.pipeline.execute(ctx, async (pipelineCtx) => {
        const method = pipelineCtx.req.method || 'GET';
        const routeMatch = this.router.match(method, parsedUrl.pathname);

        if (routeMatch) {
          pipelineCtx.params = routeMatch.params;
          await routeMatch.handler(pipelineCtx);
          return;
        }

        if (this.fallbackHandler) {
          await this.fallbackHandler(pipelineCtx, parsedUrl.pathname);
          return;
        }

        throw new NotFoundError(`Endpoint '${method} ${parsedUrl.pathname}' not found`);
      });
    } catch (err: unknown) {
      this.sendErrorResponse(res, err, parsedUrl.pathname, requestId);
    }
  }

  private sendErrorResponse(res: ServerResponse, err: unknown, instancePath: string, reqId: string): void {
    if (res.writableEnded) return;

    let problem: ProblemDetails;
    let statusCode = 500;

    if (err instanceof HttpError) {
      statusCode = err.status;
      problem = err.toProblemDetails(instancePath);
    } else {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Unhandled server exception', errorObj, undefined, reqId);
      statusCode = 500;
      problem = {
        type: 'https://aezamine.com/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected internal error occurred. Request ID logged for inspection.',
        instance: instancePath,
        timestamp: new Date().toISOString()
      };
    }

    const payload = JSON.stringify(problem);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(payload));
    res.end(payload);
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.config.port, this.config.host, () => {
        this.logger.info(`HTTP Server successfully listening on http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('HTTP Server stopped successfully');
        resolve();
      });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      this.logger.info(`Received ${signal}. Initiating graceful shutdown...`);
      try {
        await this.stop();
        process.exit(0);
      } catch (err) {
        this.logger.error('Error during shutdown', err instanceof Error ? err : new Error(String(err)));
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  }
}
