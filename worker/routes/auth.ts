import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "../../shared/schema";
import { signToken, JWTPayload } from "../middleware/auth";

type Env = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const authRouter = new Hono<{ Bindings: Env; Variables: { user?: JWTPayload } }>();

authRouter.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json().catch(() => ({}));
    if (!email || !password) {
      return c.json({ error: "Email dan password wajib diisi" }, 400);
    }

    const db = drizzle(c.env.DB, { schema });
    const userList = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

    if (userList.length === 0) {
      return c.json({ error: "Email atau password salah" }, 401);
    }

    const user = userList[0];
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return c.json({ error: "Email atau password salah" }, 401);
    }

    if (user.role === "pending") {
      return c.json({ error: "Akun Anda sedang menunggu persetujuan admin" }, 403);
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      desaId: user.desaId,
      kelompokId: user.kelompokId,
      mandiriDesaId: user.mandiriDesaId,
      mandiriKelompokId: user.mandiriKelompokId,
      generusId: user.generusId,
    };

    const token = await signToken(payload, c.env.JWT_SECRET);

    // Set cookie
    setCookie(c, "session", token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    return c.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err: any) {
    return c.json({ error: "Terjadi kesalahan server: " + (err?.message || err) }, 500);
  }
});

authRouter.post("/logout", async (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ success: true });
});

authRouter.get("/me", async (c) => {
  const user = c.get("user");
  if (!user) return c.json(null);
  return c.json({
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    desaId: user.desaId,
    kelompokId: user.kelompokId,
  });
});
