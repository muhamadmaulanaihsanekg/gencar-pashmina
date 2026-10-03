/**
 * Klien realtime — pengganti pusher-js.
 *
 * Mempertahankan API yang sama dengan pusher-js agar 8 halaman pemakai
 * (subscribe / unbind / bind) tidak perlu diubah:
 *
 *   const pusher = getPusherClient();
 *   const channel = pusher.subscribe("taaruf-channel");
 *   channel.bind("taaruf-changed", cb);
 *   ...
 *   channel.unbind("taaruf-changed");
 *   pusher.unsubscribe("taaruf-channel");
 *
 * Di baliknya: satu WebSocket per channel ke Durable Object RealtimeHub,
 * dengan reconnect otomatis.
 */

type Handler = (data: unknown) => void;

const WS_PATH = "/api/realtime/ws";

class RealtimeChannel {
  name: string;
  private handlers = new Map<string, Set<Handler>>();
  private ws: WebSocket | null = null;
  private closed = false;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(name: string) {
    this.name = name;
    this.connect();
  }

  private connect() {
    if (this.closed || typeof window === "undefined") return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}${WS_PATH}?channel=${encodeURIComponent(this.name)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
    };

    ws.onmessage = (ev) => {
      let frame: { event?: string; data?: unknown };
      try {
        frame = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }
      if (!frame?.event) return;
      const set = this.handlers.get(frame.event);
      if (!set) return;
      for (const cb of set) {
        try {
          cb(frame.data);
        } catch (err) {
          console.error("Realtime handler error:", err);
        }
      }
    };

    ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* sudah tertutup */
      }
    };
  }

  private scheduleReconnect() {
    if (this.closed || this.retryTimer) return;
    // Backoff sederhana, maksimal 15 detik.
    const delay = Math.min(1000 * 2 ** this.retry, 15000);
    this.retry++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  bind(event: string, cb: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(cb);
  }

  unbind(event?: string, cb?: Handler) {
    if (!event) {
      this.handlers.clear();
      return;
    }
    const set = this.handlers.get(event);
    if (!set) return;
    if (cb) set.delete(cb);
    else set.clear();
  }

  destroy() {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.handlers.clear();
    try {
      this.ws?.close();
    } catch {
      /* sudah tertutup */
    }
    this.ws = null;
  }
}

class RealtimeClient {
  private channels = new Map<string, { channel: RealtimeChannel; refs: number }>();

  subscribe(name: string): RealtimeChannel {
    const existing = this.channels.get(name);
    if (existing) {
      existing.refs++;
      return existing.channel;
    }
    const channel = new RealtimeChannel(name);
    this.channels.set(name, { channel, refs: 1 });
    return channel;
  }

  unsubscribe(name: string) {
    const entry = this.channels.get(name);
    if (!entry) return;
    entry.refs--;
    if (entry.refs <= 0) {
      entry.channel.destroy();
      this.channels.delete(name);
    }
  }
}

let instance: RealtimeClient | null = null;

export const getPusherClient = (): RealtimeClient | null => {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new RealtimeClient();
  return instance;
};
