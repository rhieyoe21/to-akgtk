import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "akgtk_session";
const SESSION_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET harus minimal 32 karakter.");
  return new TextEncoder().encode(value);
}

export async function createSession(user) {
  const token = await new SignJWT({ role: user.role, sessionVersion: user.sessionVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`).sign(secret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_SECONDS
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

export async function getSessionUser() {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, school: true, role: true, isActive: true, sessionVersion: true }
    });
    return user?.isActive && payload.sessionVersion === user.sessionVersion ? user : null;
  } catch { return null; }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return { error: "Silakan masuk kembali.", status: 401 };
  return { user };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user.role !== "ADMIN") return { error: "Akses admin diperlukan.", status: 403 };
  return result;
}
