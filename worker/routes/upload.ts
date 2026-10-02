import { Hono } from "hono";
import { JWTPayload } from "../middleware/auth";

type Env = {
  BUCKET: R2Bucket;
  R2_PUBLIC_URL?: string;
  JWT_SECRET: string;
};

export const uploadRouter = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

uploadRouter.post("/sign", async (c) => {
  const session = c.get("user");
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const { filename, contentType } = await c.req.json().catch(() => ({}));
  if (!filename) return c.json({ error: "Filename wajib diisi" }, 400);

  const ext = filename.split(".").pop() || "bin";
  const key = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const publicBase = c.env.R2_PUBLIC_URL || "";
  const publicUrl = publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : `/${key}`;

  return c.json({
    key,
    uploadUrl: `/api/upload/direct?key=${encodeURIComponent(key)}`,
    publicUrl,
  });
});

uploadRouter.put("/direct", async (c) => {
  const key = c.req.query("key");
  if (!key) return c.json({ error: "Key wajib disertakan" }, 400);

  const contentType = c.req.header("Content-Type") || "application/octet-stream";
  const body = c.req.raw.body;

  if (!body) return c.json({ error: "Body tidak boleh kosong" }, 400);

  await c.env.BUCKET.put(key, body, {
    httpMetadata: { contentType },
  });

  const publicBase = c.env.R2_PUBLIC_URL || "";
  const publicUrl = publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : `/${key}`;

  return c.json({ success: true, key, publicUrl });
});
