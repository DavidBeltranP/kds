import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private screenId: string = '';
  private apiKey: string = '';

  connect(screenId: string, apiKey: string): Socket {
    this.screenId = screenId;
    this.apiKey = apiKey;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this.register();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    return this.socket;
  }

  private register(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('screen:register', {
        screenId: this.screenId,
        apiKey: this.apiKey,
      });
    }
  }

  sendHeartbeat(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('screen:heartbeat', {
        screenId: this.screenId,
        timestamp: Date.now(),
      });
    }
  }

  updateStatus(status: 'ONLINE' | 'STANDBY'): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('screen:status', {
        screenId: this.screenId,
        status,
      });
    }
  }

  requestOrders(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('screen:requestOrders', {
        screenId: this.screenId,
      });
    }
  }

  finishOrder(orderId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('order:finish', {
        orderId,
        screenId: this.screenId,
        timestamp: Date.now(),
      });
    }
  }

  undoOrder(orderId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('order:undo', {
        orderId,
        screenId: this.screenId,
      });
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
