import { HttpContext } from '../core/router';
import { RakNetPingClient } from '../network/raknet-ping';
import { WebSocketServer } from '../websocket/ws-server';
import { PlayerTranslate } from '../infrastructure/translate-service';

export class StatusController {
  private readonly pingClient: RakNetPingClient;
  private readonly wsServer?: WebSocketServer | undefined;

  constructor(pingClient: RakNetPingClient, wsServer?: WebSocketServer | undefined) {
    this.pingClient = pingClient;
    this.wsServer = wsServer;
  }

  public getStatus = async (ctx: HttpContext): Promise<void> => {
    const lang = ctx.query['lang'] as string | undefined;
    const forceRefresh = ctx.query['refresh'] === 'true';

    const status = await this.pingClient.getStatus(forceRefresh);
    const message = status.online
      ? PlayerTranslate.translate(lang, 'server.online', status.onlinePlayers, status.maxPlayers)
      : PlayerTranslate.translate(lang, 'server.offline');

    ctx.json({
      success: true,
      data: {
        ...status,
        message
      }
    });
  };

  public getHealth = async (ctx: HttpContext): Promise<void> => {
    const lang = ctx.query['lang'] as string | undefined;
    const memory = process.memoryUsage();

    ctx.json({
      status: 'UP',
      message: PlayerTranslate.translate(lang, 'server.healthy'),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      websocketClients: this.wsServer ? this.wsServer.getConnectedClientsCount() : 0,
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024))
      }
    });
  };
}
