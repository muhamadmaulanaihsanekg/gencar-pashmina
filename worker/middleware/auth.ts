import { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { SignJWT, jwtVerify } from "jose";

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  desaId: number | null;
  kelompokId: number | null;
  mandiriDesaId?: number | null;
  mandiriKelompokId?: number | null;
  generusId?: string | null;
}

export async function signToken(payload: JWTPayload, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret || "default-secret-key-32-chars-minimum-safe");
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret || "default-secret-key-32-chars-minimum-safe");
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const secret = c.env.JWT_SECRET;
  let token = getCookie(c, "session");

  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (token) {
    const user = await verifyToken(token, secret);
    if (user) {
      c.set("user", user);
    }
  }

  await next();
}

export function requireAuth(roles?: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JWTPayload | undefined;
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (roles && !roles.includes(user.role)) {
      return c.json({ error: "Forbidden: akses ditolak" }, 403);
    }
    await next();
  };
}
