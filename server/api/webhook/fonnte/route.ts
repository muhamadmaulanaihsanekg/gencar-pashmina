import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, settings, mandiriKegiatan } from "@/lib/schema";
import { eq, or, like } from "drizzle-orm";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: any = {};

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    }

    console.log("Webhook received raw data:", JSON.stringify(data));

    let sender = data.sender || "";
    let message = data.message || "";

    // Parse Evolution API webhook payload format
    if (data.event) {
      if (data.event !== "messages.upsert") {
        return NextResponse.json({ success: true, message: `Ignored event: ${data.event}` });
      }
      
      const evoData = data.data;
      if (evoData) {
        // Do not process messages sent by the bot itself
        if (evoData.key?.fromMe) {
          return NextResponse.json({ success: true, message: "Ignored self message" });
        }
        
        const remoteJid = evoData.key?.remoteJid || "";
        sender = remoteJid.split("@")[0] || "";
        message = evoData.message?.conversation || 
                  evoData.message?.extendedTextMessage?.text || 
                  "";
      }
    }

    if (!sender || !message) {
      return NextResponse.json({ error: "Missing sender or message" }, { status: 400 });
    }

    // Clean and normalize sender phone number
    const cleanSender = sender.replace(/\D/g, "");
    const phoneSuffix = cleanSender.length >= 9 ? cleanSender.slice(-9) : cleanSender;

    // Extract name from message template: "Saya [Nama], siap hadir dalam acara taaruf kubro"
    const nameMatch = message.match(/Saya\s+(.*?)\s*,\s*siap\s+hadir/i);
    const extractedName = nameMatch ? nameMatch[1].trim() : "";

    let foundGenerus = null;

    // Find the user by phone number first
    if (phoneSuffix) {
      foundGenerus = await db.query.generus.findFirst({
        where: or(
          like(generus.noTelp, `%${phoneSuffix}`),
          like(generus.noTelpOrtu, `%${phoneSuffix}`)
        ),
      });
    }

    let replyMessage = "";

    if (foundGenerus) {
      // Clean names for a robust comparison (case-insensitive and ignore special characters)
      const dbNameClean = foundGenerus.nama.toLowerCase().replace(/[^a-z0-9]/g, "");
      const extractedNameClean = extractedName.toLowerCase().replace(/[^a-z0-9]/g, "");

      const isNameMatch = dbNameClean.includes(extractedNameClean) || extractedNameClean.includes(dbNameClean);

      if (isNameMatch) {
        // Fetch active event settings to get place & time
        const activeSetting = await db.query.settings.findFirst({
          where: eq(settings.key, "mandiri_active_kegiatan_id"),
        });

        let eventLocation = "Masjid Baitul Mu'thi / Tempat Acara";
        let eventTime = "Hari H Acara";

        if (activeSetting?.value) {
          const event = await db.query.mandiriKegiatan.findFirst({
            where: eq(mandiriKegiatan.id, activeSetting.value),
          });
          if (event) {
            eventLocation = event.lokasi || eventLocation;
            eventTime = event.tanggal || eventTime;
          }
        }

        replyMessage = `Halo *${foundGenerus.nama}*! 👋\n\nTerima kasih atas konfirmasi Anda. Kehadiran Anda telah terverifikasi untuk acara *Taaruf Kubro*.\n\n📍 *Tempat:* ${eventLocation}\n📅 *Waktu:* ${eventTime}\n🔑 *Kode Masuk / ID Login:* *${foundGenerus.nomorUnik}*\n\nSampai jumpa di lokasi acara!`;
      } else {
        // Phone number matches but name is different
        replyMessage = `Halo! 👋\n\nNomor WhatsApp Anda terdaftar di database kami, namun nama yang Anda kirimkan (*${extractedName || 'kosong'}*) tidak sesuai dengan data terdaftar (*${foundGenerus.nama}*).\n\nMohon kirimkan kembali dengan format yang benar.`;
      }
    } else {
      // Phone number not registered
      replyMessage = `Halo! 👋\n\nNomor WhatsApp Anda belum terdaftar di database sistem GENCAR.\n\nSilakan lakukan pendaftaran terlebih dahulu melalui website atau hubungi panitia jika nomor WhatsApp Anda berubah.`;
    }

    // Call shared sendWhatsApp utility to send the response back to user
    await sendWhatsApp(sender, replyMessage);

    return NextResponse.json({ success: true, verified: !!foundGenerus });
  } catch (error: any) {
    console.error("Fonnte Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
