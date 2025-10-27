// client/src/lib/embedded/syncClient.ts
export interface SyncMessage {
  type: 'patch' | 'hello' | 'ping';
  data?: any;
  ts?: number;
}

export type OnMessage = (msg: SyncMessage) => void;

export class SyncClient {
  private es?: EventSource;
  private room: string;
  private uid: string;
  private handlers: Map<string, OnMessage[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(params: { room: string; uid: string }) {
    this.room = params.room;
    this.uid = params.uid;
  }

  /**
   * Connect SSE stream
   */
  connect() {
    if (this.es) return;

    const url = `/api/sync?room=${encodeURIComponent(this.room)}&uid=${this.uid}`;
    this.es = new EventSource(url);

    this.es.addEventListener('hello', (e: any) => {
      console.log('[sync] hello:', e.data);
      this.reconnectAttempts = 0;
      this.emit('hello', JSON.parse(e.data));
    });

    this.es.addEventListener('patch', (e: any) => {
      const patch = JSON.parse(e.data);
      this.emit('patch', patch);
    });

    this.es.addEventListener('ping', (e: any) => {
      this.emit('ping', {});
    });

    this.es.onerror = () => {
      console.warn('[sync] error, reconnecting...');
      this.close();
      this.reconnect();
    };
  }

  /**
   * Attempt reconnect with backoff + jitter
   */
  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[sync] max reconnect attempts reached');
      return;
    }
    this.reconnectAttempts++;
    // Jitter: avoid thundering herd
    const baseDelay = 1000 * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * baseDelay * 0.1;
    const delay = baseDelay + jitter;
    setTimeout(() => this.connect(), delay);
  }

  /**
   * Publish patch/delta to room
   */
  async publish(patch: any) {
    try {
      const response = await fetch(`/api/sync?room=${encodeURIComponent(this.room)}&uid=${this.uid}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        console.error('[sync] publish failed:', response.status);
      }
    } catch (err) {
      console.error('[sync] publish error:', err);
    }
  }

  /**
   * Subscribe to message type
   */
  on(type: string, handler: OnMessage) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * Emit to all subscribers
   */
  private emit(type: string, data: any) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach((h) => h({ type, data } as any));
    }
  }

  close() {
    this.es?.close();
    this.es = undefined;
  }
}
