import { Server as RawHttpServer, IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { createHash, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Logger } from '../core/logger';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export enum WsOpcode {
  CONTINUATION = 0x0,
  TEXT = 0x1,
  BINARY = 0x2,
  CLOSE = 0x8,
  PING = 0x9,
  PONG = 0xA
}

export class WebSocketConnection extends EventEmitter {
  public readonly id: string;
  public readonly socket: Socket;
  public isAlive: boolean;
  private buffer: Buffer = Buffer.alloc(0);

  constructor(socket: Socket) {
    super();
    this.id = randomUUID();
    this.socket = socket;
    this.isAlive = true;

    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => {
      this.cleanup();
      this.emit('close');
    });
    this.socket.on('error', (err) => {
      this.cleanup();
      this.emit('error', err);
    });
  }

  private cleanup(): void {
    this.buffer = Buffer.alloc(0);
    this.removeAllListeners();
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 2) {
      const firstByte = this.buffer[0]!;
      const secondByte = this.buffer[1]!;

      const fin = (firstByte & 0x80) === 0x80;
      const opcode = firstByte & 0x0F;
      const masked = (secondByte & 0x80) === 0x80;
      let payloadLength = secondByte & 0x7F;
      let offset = 2;

      if (payloadLength === 126) {
        if (this.buffer.length < 4) return;
        payloadLength = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (this.buffer.length < 10) return;
        const high = this.buffer.readUInt32BE(2);
        const low = this.buffer.readUInt32BE(6);
        payloadLength = high * 4294967296 + low;
        offset = 10;
      }

      let maskKey: Buffer | null = null;
      if (masked) {
        if (this.buffer.length < offset + 4) return;
        maskKey = this.buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      if (this.buffer.length < offset + payloadLength) return;

      const rawPayload = this.buffer.subarray(offset, offset + payloadLength);
      const unmaskedPayload = Buffer.alloc(payloadLength);

      if (masked && maskKey) {
        for (let i = 0; i < payloadLength; i++) {
          unmaskedPayload[i] = rawPayload[i]! ^ maskKey[i % 4]!;
        }
      } else {
        rawPayload.copy(unmaskedPayload);
      }

      this.buffer = this.buffer.subarray(offset + payloadLength);

      this.dispatchFrame(fin, opcode, unmaskedPayload);
    }
  }

  private dispatchFrame(_fin: boolean, opcode: number, payload: Buffer): void {
    switch (opcode) {
      case WsOpcode.TEXT:
        this.emit('message', payload.toString('utf-8'));
        break;
      case WsOpcode.PING:
        this.sendFrame(WsOpcode.PONG, payload);
        break;
      case WsOpcode.PONG:
        this.isAlive = true;
        break;
      case WsOpcode.CLOSE:
        this.close();
        break;
      default:
        break;
    }
  }

  private sendFrame(opcode: WsOpcode, payload: Buffer): void {
    if (this.socket.destroyed || !this.socket.writable) return;

    const length = payload.length;
    let headerLength = 2;

    if (length >= 126 && length <= 65535) {
      headerLength = 4;
    } else if (length > 65535) {
      headerLength = 10;
    }

    const frame = Buffer.alloc(headerLength + length);
    frame[0] = 0x80 | opcode;

    if (length < 126) {
      frame[1] = length;
      payload.copy(frame, 2);
    } else if (length <= 65535) {
      frame[1] = 126;
      frame.writeUInt16BE(length, 2);
      payload.copy(frame, 4);
    } else {
      frame[1] = 127;
      frame.writeBigUInt64BE(BigInt(length), 2);
      payload.copy(frame, 10);
    }

    this.socket.write(frame);
  }

  public send(data: string | object): void {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    this.sendFrame(WsOpcode.TEXT, Buffer.from(serialized, 'utf-8'));
  }

  public ping(): void {
    this.isAlive = false;
    this.sendFrame(WsOpcode.PING, Buffer.alloc(0));
  }

  public close(code = 1000, reason = 'Normal Closure'): void {
    if (this.socket.writable) {
      const reasonBuf = Buffer.from(reason, 'utf-8');
      const payload = Buffer.alloc(2 + reasonBuf.length);
      payload.writeUInt16BE(code, 0);
      reasonBuf.copy(payload, 2);
      this.sendFrame(WsOpcode.CLOSE, payload);
      this.socket.end();
    }
  }
}

export class WebSocketServer extends EventEmitter {
  private readonly clients = new Set<WebSocketConnection>();
  private readonly logger: Logger;
  private readonly endpointPath: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(server: RawHttpServer, endpointPath = '/ws', logger: Logger) {
    super();
    this.endpointPath = endpointPath;
    this.logger = logger.child('WebSocketServer');

    server.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket as Socket, head));
    this.startHeartbeat();
  }

  private handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer): void {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== this.endpointPath) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    const upgrade = req.headers['upgrade'];
    if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const acceptKey = createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ].join('\r\n');

    socket.write(responseHeaders);

    const client = new WebSocketConnection(socket);
    this.clients.add(client);
    this.logger.info(`New WebSocket client connected (ID: ${client.id}, Total: ${this.clients.size})`);

    client.on('close', () => {
      this.clients.delete(client);
      this.logger.info(`WebSocket client disconnected (ID: ${client.id}, Remaining: ${this.clients.size})`);
    });

    client.on('error', (err) => {
      this.clients.delete(client);
      this.logger.warn(`WebSocket client error (ID: ${client.id}): ${err.message}`);
    });

    this.emit('connection', client);

    if (head && head.length > 0) {
      socket.emit('data', head);
    }
  }

  public broadcast(data: unknown): void {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    for (const client of this.clients) {
      client.send(serialized);
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          this.logger.debug(`Terminating unresponsive WebSocket client ${client.id}`);
          client.close(1006, 'Ping timeout');
          this.clients.delete(client);
          continue;
        }
        client.ping();
      }
    }, 30000);
    this.heartbeatTimer.unref();
  }

  public close(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const client of this.clients) {
      client.close(1001, 'Server shutting down');
    }
    this.clients.clear();
  }
}
