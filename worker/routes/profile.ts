import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "../../shared/schema";
import { JWTPayload } from "../middleware/auth";

type Env = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const profileRouter = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

profileRouter.get("/", async (c) => {
  const session = c.get("user");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = drizzle(c.env.DB, { schema });

  if (session.generusId) {
    const genList = await db
      .select()
      .from(schema.generus)
      .where(eq(schema.generus.id, session.generusId))
      .limit(1);

    if (genList.length > 0) {
      const g = genList[0];
      return c.json({
        id: g.id,
        name: g.nama,
        email: session.email,
        role: session.role,
        foto: g.foto || "",
        generusId: g.id,
        desaId: g.desaId,
        kelompokId: g.kelompokId,
        isInMandiri: ["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "tim_pnkb_gambuh"].includes(session.role),
      });
    }
  }

  return c.json({
    id: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
    foto: "",
    generusId: session.generusId || null,
    desaId: session.desaId,
    kelompokId: session.kelompokId,
    isInMandiri: ["admin", "pengurus_daerah", "kmm_daerah", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "tim_pnkb_gambuh"].includes(session.role),
  });
});
