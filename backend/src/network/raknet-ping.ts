import { createSocket, Socket } from 'node:dgram';
import { Logger } from '../core/logger';

const RAKNET_MAGIC = Buffer.from([
  0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe,
  0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78
]);

export interface BedrockServerStatus {
  online: boolean;
  host: string;
  port: number;
  serverName: string;
  protocolVersion: number;
  minecraftVersion: string;
  onlinePlayers: number;
  maxPlayers: number;
  serverId: string;
  subName: string;
  gameMode: string;
  latencyMs: number;
  lastUpdated: string;
}

export class RakNetPingClient {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;
  private readonly logger: Logger;
  private cachedStatus: BedrockServerStatus | null = null;
  private lastFetchTime = 0;
  private readonly cacheTtlMs = 10000;

  constructor(host = 'aezamine.com', port = 19132, timeoutMs = 2500, logger?: Logger) {
    this.host = host;
    this.port = port;
    this.timeoutMs = timeoutMs;
    this.logger = logger ? logger.child('RakNetPing') : new Logger('RakNetPing');
  }

  public async getStatus(forceRefresh = false): Promise<BedrockServerStatus> {
    const now = Date.now();
    if (!forceRefresh && this.cachedStatus && (now - this.lastFetchTime < this.cacheTtlMs)) {
      return this.cachedStatus;
    }

    try {
      const status = await this.ping();
      this.cachedStatus = status;
      this.lastFetchTime = now;
      return status;
    } catch (err) {
      this.logger.warn(`Failed to ping Bedrock server at ${this.host}:${this.port} - ${err instanceof Error ? err.message : String(err)}`);
      
      const offlineStatus: BedrockServerStatus = {
        online: false,
        host: this.host,
        port: this.port,
        serverName: 'AézaMine Bedrock',
        protocolVersion: 0,
        minecraftVersion: '1.20+',
        onlinePlayers: 0,
        maxPlayers: 100,
        serverId: '0',
        subName: 'Survival+',
        gameMode: 'Survival',
        latencyMs: -1,
        lastUpdated: new Date().toISOString()
      };
      return offlineStatus;
    }
  }

  private ping(): Promise<BedrockServerStatus> {
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const socket: Socket = createSocket('udp4');
      const startTime = process.hrtime.bigint();
      let timer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        try {
          socket.removeAllListeners();
          socket.close();
        } catch {}
      };

      timer = setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        reject(new Error(`RakNet ping timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      timer.unref();

      socket.on('error', (err) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        reject(err);
      });

      socket.on('message', (msg: Buffer) => {
        if (isSettled) return;
        isSettled = true;
        const endTime = process.hrtime.bigint();
        const latencyMs = Math.round(Number(endTime - startTime) / 1_000_000);
        cleanup();

        try {
          const status = this.parsePong(msg, latencyMs);
          resolve(status);
        } catch (parseErr) {
          reject(parseErr);
        }
      });

      const packet = this.buildPingPacket();
      socket.send(packet, 0, packet.length, this.port, this.host, (err) => {
        if (err && !isSettled) {
          isSettled = true;
          cleanup();
          reject(err);
        }
      });
    });
  }

  private buildPingPacket(): Buffer {
    const packet = Buffer.alloc(33);
    packet.writeUInt8(0x01, 0);
    packet.writeBigInt64BE(BigInt(Date.now()), 1);
    RAKNET_MAGIC.copy(packet, 9);
    packet.writeBigInt64BE(BigInt('0x123456789abcdef0'), 25);
    return packet;
  }

  private parsePong(msg: Buffer, latencyMs: number): BedrockServerStatus {
    if (msg.length < 35 || msg[0] !== 0x1c) {
      throw new Error(`Invalid RakNet pong packet header: ${msg[0]}`);
    }

    const payloadLength = msg.readUInt16BE(33);
    const payload = msg.subarray(35, 35 + payloadLength).toString('utf-8');
    const parts = payload.split(';');

    return {
      online: true,
      host: this.host,
      port: this.port,
      serverName: parts[1] || 'AézaMine Server',
      protocolVersion: parseInt(parts[2] || '0', 10),
      minecraftVersion: parts[3] || '1.20+',
      onlinePlayers: parseInt(parts[4] || '0', 10),
      maxPlayers: parseInt(parts[5] || '0', 10),
      serverId: parts[6] || '',
      subName: parts[7] || '',
      gameMode: parts[8] || 'Survival',
      latencyMs,
      lastUpdated: new Date().toISOString()
    };
  }
}
