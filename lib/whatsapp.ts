/**
 * Shared utility for sending WhatsApp notifications using Meta API or Fonnte
 * Priority Order:
 * 1. Meta WhatsApp Business API (Primary)
 * 2. Fonnte API Token 1 (Fallback 1)
 * 3. Fonnte API Token 2 (Fallback 2)
 */
export const sendWhatsApp = async (target: string, msg: string) => {
  if (!target) return;

  // Clean and normalize target phone number
  let cleanTarget = target.replace(/\D/g, "");
  if (cleanTarget.startsWith("0")) {
    cleanTarget = "62" + cleanTarget.slice(1);
  }

  console.log("=== sendWhatsApp Triggered ===");
  console.log(`- Target: ${target} -> Cleaned: ${cleanTarget}`);

  if (!cleanTarget.startsWith("62")) {
    console.error(`Invalid phone number target: ${target}`);
    return;
  }

  // 1. Primary Priority: WhatsApp Business API (Meta Cloud API)
  const waApiKey = process.env.WHATSAPP_API_KEY;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1123675760836996";
  const waTemplateLang = process.env.WHATSAPP_TEMPLATE_LANG || "id";

  if (waApiKey && waPhoneId) {
    try {
      console.log("Attempt 1: Using Meta WhatsApp Business API (Primary)...");
      
      // Flexible extraction for name and nomor urut
      let nama = "";
      const kepadaMatch = msg.match(/Kepada:\s*\*([^*]+)\*/i);
      if (kepadaMatch) {
        nama = kepadaMatch[1].trim();
      } else {
        const firstBoldMatch = msg.match(/\*([^*]+)\*/);
        if (firstBoldMatch) nama = firstBoldMatch[1].trim();
      }

      let nomorUrut = "";
      const noUrutMatch = msg.match(/\(\*#([^*]+)\*\)/) || msg.match(/\(#\s*([^)]+)\)/);
      if (noUrutMatch) {
        nomorUrut = noUrutMatch[1].trim();
      }
      
      let payload: any;
      
      if (nama && nomorUrut) {
        console.log(`Sending panggilan_taaruf template via Meta API. Name: "${nama}", No Urut: "${nomorUrut}"`);
        
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanTarget,
          type: "template",
          template: {
            name: "panggilan_taaruf",
            language: {
              code: waTemplateLang
            },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: nama },
                  { type: "text", text: nomorUrut }
                ]
              }
            ]
          }
        };
      } else {
        console.log("No template pattern matched. Sending freeform text message via Meta API.");
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanTarget,
          type: "text",
          text: {
            body: msg
          }
        };
      }

      const res = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${waApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      console.log("Meta WhatsApp Business API response:", JSON.stringify(resData, null, 2));
      
      // Only return if HTTP status is OK, no error object, and messages array is non-empty
      if (res.ok && !resData.error && Array.isArray(resData.messages) && resData.messages.length > 0) {
        return resData;
      }
      console.warn("Meta WhatsApp Business API failed or returned error, attempting Fonnte fallback...", resData);
    } catch (err) {
      console.error("Failed to send via Meta WhatsApp Business API, attempting Fonnte fallback...", err);
    }
  }

  // 2. Secondary & Tertiary Fallbacks: Fonnte API (Token 1, then Token 2)
  const rawFonnteTokens = [
    process.env.FONNTE_TOKEN,
    process.env.FONNTE_TOKEN_2 || process.env.FONNTE_TOKEN_BACKUP || "nqYfKQbi3gemc59g4CqX",
    process.env.FONNTE_API_KEY,
  ];
  const fonnteTokens = rawFonnteTokens.filter(
    (t, index, self) => Boolean(t) && self.indexOf(t) === index
  ) as string[];

  for (let i = 0; i < fonnteTokens.length; i++) {
    const token = fonnteTokens[i];
    try {
      console.log(`Attempt ${i + 2}: Using Fonnte API Token ${i + 1} (${token.slice(0, 6)}...)...`);
      const formData = new URLSearchParams();
      formData.append("target", cleanTarget);
      formData.append("message", msg);
      formData.append("countryCode", "62");

      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": token,
        },
        body: formData,
      });

      const resData = await res.json();
      console.log(`Fonnte API (Token ${i + 1}) response:`, JSON.stringify(resData, null, 2));
      if (resData.status) {
        return resData;
      }
      console.warn(`Fonnte API Token ${i + 1} returned status false, attempting next fallback...`, resData);
    } catch (fonnteErr) {
      console.error(`Failed to send via Fonnte API (Token ${i + 1}):`, fonnteErr);
    }
  }
};
