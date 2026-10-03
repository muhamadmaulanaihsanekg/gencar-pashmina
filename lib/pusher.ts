/**
 * Pengirim realtime — pengganti Pusher server SDK.
 *
 * Bentuk API dipertahankan persis (`pusherServer.trigger(channel, event, data)`)
 * agar 23 pemanggil di server/api tidak perlu diubah. Di baliknya, event
 * dikirim ke Durable Object RealtimeHub yang menyiarkannya via WebSocket.
 */

type Env = { REALTIME?: DurableObjectNamespace };

/**
 * Binding Worker tidak tersedia sebagai variabel modul, jadi diambil dari
 * globalThis.__env yang diisi api-router (lihat server/api-router.ts).
 */
function getRealtime(): DurableObjectNamespace | undefined {
  const env = (globalThis as unknown as { __env?: Env }).__env;
  return env?.REALTIME;
}

class RealtimePublisher {
  async trigger(
    channel: string,
    event: string,
    data?: unknown
  ): Promise<{ ok: boolean; delivered?: number; error?: string }> {
    const realtime = getRealtime();
    if (!realtime) {
      // Jangan gagalkan request utama hanya karena realtime tidak tersedia.
      console.warn("[realtime] binding REALTIME tidak ada; event dilewati:", channel, event);
      return { ok: false, error: "REALTIME binding unavailable" };
    }

    try {
      // Satu DO untuk semua channel; idFromName membuatnya deterministik.
      const stub = realtime.get(realtime.idFromName("taaruf-hub"));
      const res = await stub.fetch("https://realtime/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel, event, data }),
      });
      return (await res.json()) as { ok: boolean; delivered?: number };
    } catch (err: any) {
      console.error("[realtime] publish gagal:", err?.message || err);
      return { ok: false, error: String(err?.message || err) };
    }
  }
}

export const pusherServer = new RealtimePublisher();

// Re-export agar pemanggil lama yang mengimpor nama lain tetap jalan.
export const realtimeServer = pusherServer;
