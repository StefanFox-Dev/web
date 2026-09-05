import { appStore } from '../core/state';
import { globalEventBus } from '../core/event-bus';
export class WebSocketClient {
    socket = null;
    reconnectTimer = null;
    retryCount = 0;
    maxRetries = 10;
    isDestroyed = false;
    connect() {
        if (this.isDestroyed)
            return;
        this.cleanup();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host || 'localhost:3000';
        const url = `${protocol}//${host}/ws`;
        try {
            this.socket = new WebSocket(url);
            this.socket.onopen = () => {
                this.retryCount = 0;
                globalEventBus.emit('ws:connected');
            };
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                }
                catch { }
            };
            this.socket.onclose = () => {
                globalEventBus.emit('ws:disconnected');
                this.scheduleReconnect();
            };
            this.socket.onerror = () => {
                if (this.socket) {
                    this.socket.close();
                }
            };
        }
        catch {
            this.scheduleReconnect();
        }
    }
    handleServerMessage(msg) {
        if (msg.type === 'SERVER_TELEMETRY' || msg.type === 'INIT_TELEMETRY') {
            const s = msg.server;
            if (s) {
                appStore.setState({
                    serverOnline: Boolean(s.online),
                    onlineCount: s.onlinePlayers ?? 0,
                    maxPlayers: s.maxPlayers ?? 100,
                    latencyMs: s.latencyMs ?? 0,
                    serverVersion: s.minecraftVersion || '1.20+'
                });
                globalEventBus.emit('telemetry:updated', s);
            }
        }
    }
    scheduleReconnect() {
        if (this.isDestroyed || this.retryCount >= this.maxRetries)
            return;
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        const backoff = Math.min(1000 * Math.pow(1.5, this.retryCount), 15000);
        const jitter = Math.random() * 500;
        this.retryCount++;
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, backoff + jitter);
    }
    cleanup() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onclose = null;
            this.socket.onerror = null;
            try {
                this.socket.close();
            }
            catch { }
            this.socket = null;
        }
    }
    destroy() {
        this.isDestroyed = true;
        this.cleanup();
    }
}
export const wsClient = new WebSocketClient();
//# sourceMappingURL=ws-client.js.map