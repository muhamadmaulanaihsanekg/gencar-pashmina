/**
 * RealtimeHub — Durable Object pengganti Pusher.
 *
 * Satu instance menampung semua koneksi WebSocket dan menyiarkan event ke
 * seluruh pelanggan. Memakai WebSocket Hibernation API: saat tidak ada pesan,
 * DO tidur sehingga biayanya ~0 ketika sepi.
 *
 * Kontrak (identik dengan Pusher yang dipakai aplikasi):
 *   POST /publish  { channel, event, data }  → siarkan ke subscriber channel
 *   GET  /ws?channel=...                     → WebSocket
 *
 * Klien menerima frame: { event: string, data: unknown }
 */
import { DurableObject } from "cloudflare:workers";

type Frame = { event: string; data: unknown };

export class RealtimeHub extends DurableObject {
  /**
   * Simpan channel per koneksi. Pakai tag WebSocket untuk menandai channel,
   * sehingga bisa memilih penerima tanpa membangunkan DO dari hibernasi.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/publish")) {
      return this.handlePublish(request);
    }
    if (url.pathname.endsWith("/ws")) {
      return this.handleWebSocket(request, url);
    }
    return new Response("Not found", { status: 404 });
  }

  private async handlePublish(request: Request): Promise<Response> {
    let payload: { channel?: string; event?: string; data?: unknown };
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { channel, event, data } = payload;
    if (!channel || !event) {
      return Response.json({ error: "channel dan event wajib" }, { status: 400 });
    }

    const frame = JSON.stringify({ event, data: data ?? {} });
    let delivered = 0;

    for (const ws of this.ctx.getWebSockets(channel)) {
      try {
        ws.send(frame);
        delivered++;
      } catch {
        // Koneksi mati — biarkan tertutup sendiri.
      }
    }

    return Response.json({ ok: true, delivered });
  }

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    const channel = url.searchParams.get("channel");
    if (!channel) return new Response("channel wajib", { status: 400 });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Hibernation API: DO boleh tidur, koneksi tetap hidup.
    this.ctx.acceptWebSocket(server, [channel]);

    server.send(JSON.stringify({ event: "connected", data: { channel } }));
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Pesan dari klien diabaikan — kanal ini hanya siaran satu arah. */
  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void> {}

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      // sudah tertutup
    }
  }
}
