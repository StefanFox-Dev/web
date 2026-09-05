import { existsSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { HttpServer } from './core/http-server';
import { Router, HttpContext } from './core/router';
import {
  MiddlewarePipeline,
  createCorsMiddleware,
  createSecurityHeadersMiddleware,
  createRateLimiterMiddleware,
  createBodyParserMiddleware,
  createRequestLoggerMiddleware
} from './core/middleware';
import { Container } from './core/di-container';
import { Logger, LogLevel } from './core/logger';
import { WebSocketServer } from './websocket/ws-server';
import { RakNetPingClient } from './network/raknet-ping';
import { StaffRepository } from './infrastructure/staff-repository';
import { RulesRepository } from './infrastructure/rules-repository';
import { RanksRepository } from './infrastructure/ranks-repository';
import { StatusController } from './controllers/status-controller';
import { RanksController } from './controllers/ranks-controller';
import { StaffController } from './controllers/staff-controller';
import { RulesController } from './controllers/rules-controller';
import { NotFoundError } from './core/errors';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

export async function bootstrap(): Promise<{ server: HttpServer; wsServer: WebSocketServer }> {
  const logger = new Logger('AézaMine', LogLevel.INFO);
  logger.info('Initializing Web Application...');

  const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    bedrockHost: process.env.BEDROCK_HOST || 'aezamine.com',
    bedrockPort: parseInt(process.env.BEDROCK_PORT || '19132', 10)
  };

  const container = new Container();
  container.registerSingleton(Logger, logger);
  container.registerSingleton(StaffRepository, () => new StaffRepository(logger));
  container.registerSingleton(RulesRepository, () => new RulesRepository(logger));
  container.registerSingleton(RanksRepository, () => new RanksRepository(logger));
  container.registerSingleton(RakNetPingClient, () => new RakNetPingClient(config.bedrockHost, config.bedrockPort, 3000, logger));

  const staffRepo = container.resolve(StaffRepository);
  const rulesRepo = container.resolve(RulesRepository);
  const ranksRepo = container.resolve(RanksRepository);
  const pingClient = container.resolve(RakNetPingClient);

  const statusController = new StatusController(pingClient);
  const ranksController = new RanksController(ranksRepo);
  const staffController = new StaffController(staffRepo);
  const rulesController = new RulesController(rulesRepo);

  const router = new Router();

  router.get('/api/v1/health', statusController.getHealth);
  router.get('/api/v1/status', statusController.getStatus);
  router.get('/api/v1/ranks', ranksController.getAll);
  router.get('/api/v1/ranks/:id', ranksController.getById);
  router.post('/api/v1/ranks/calculate', ranksController.calculateUpgrade);
  router.get('/api/v1/staff', staffController.getAll);
  router.get('/api/v1/staff/:name', staffController.getByName);
  router.get('/api/v1/rules', rulesController.getAll);
  router.get('/api/v1/rules/:category', rulesController.getCategory);

  const possibleRoots = [
    resolve(process.cwd(), '../site'),
    resolve(process.cwd(), 'site'),
    resolve(process.cwd(), 'web/site'),
    resolve(__dirname, '../../../../site'),
    resolve(__dirname, '../../../site')
  ];

  let staticRoot = possibleRoots[0]!;
  for (const rootPath of possibleRoots) {
    if (existsSync(rootPath) && existsSync(resolve(rootPath, 'index.html'))) {
      staticRoot = rootPath;
      break;
    }
  }

  const serveStaticFile = async (ctx: HttpContext, filePath: string): Promise<void> => {
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        throw new NotFoundError('Not a file');
      }

      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      ctx.res.statusCode = 200;
      ctx.res.setHeader('Content-Type', contentType);
      ctx.res.setHeader('Content-Length', stats.size);
      ctx.res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=3600');

      const stream = createReadStream(filePath);
      stream.pipe(ctx.res);
    } catch {
      throw new NotFoundError('File not found');
    }
  };

  const pipeline = new MiddlewarePipeline();
  pipeline.use(createCorsMiddleware());
  pipeline.use(createSecurityHeadersMiddleware());
  pipeline.use(createRateLimiterMiddleware({ maxTokens: 60, refillRatePerSec: 20 }));
  pipeline.use(createBodyParserMiddleware(8 * 1024 * 1024));
  pipeline.use(createRequestLoggerMiddleware(logger));

  const server = new HttpServer(
    { port: config.port, host: config.host },
    router,
    pipeline,
    logger
  );

  server.setFallbackHandler(async (ctx, pathname) => {
    const cleanPath = pathname.replace(/^\/+/, '');
    let candidatePath = join(staticRoot, cleanPath);
    if (!existsSync(candidatePath) && existsSync(candidatePath + '.js')) {
      candidatePath = candidatePath + '.js';
    }

    if (existsSync(candidatePath) && (await stat(candidatePath)).isFile()) {
      return serveStaticFile(ctx, candidatePath);
    }

    if (!extname(cleanPath)) {
      const indexPath = resolve(staticRoot, 'index.html');
      if (existsSync(indexPath)) {
        return serveStaticFile(ctx, indexPath);
      }
    }

    throw new NotFoundError(`Resource not found: ${pathname}`);
  });

  const wsServer = new WebSocketServer(server.getRawServer(), '/ws', logger);

  wsServer.on('connection', async (client) => {
    try {
      const status = await pingClient.getStatus();
      client.send({
        type: 'INIT_TELEMETRY',
        timestamp: new Date().toISOString(),
        server: status
      });
    } catch (err) {
      logger.warn(`Failed to push initial telemetry: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  const telemetryTimer = setInterval(async () => {
    if (wsServer.getConnectedClientsCount() > 0) {
      try {
        const status = await pingClient.getStatus();
        wsServer.broadcast({
          type: 'SERVER_TELEMETRY',
          timestamp: new Date().toISOString(),
          server: status
        });
      } catch {}
    }
  }, 5000);
  telemetryTimer.unref();

  await server.start();
  logger.info(`Web Server running at http://${config.host}:${config.port}`);
  logger.info(`WebSocket Server active at ws://${config.host}:${config.port}/ws`);

  return { server, wsServer };
}

if (require.main === module) {
  bootstrap().catch((err) => {
    process.stderr.write(`Fatal bootstrap error: ${err.message}\n${err.stack}\n`);
    process.exit(1);
  });
}
