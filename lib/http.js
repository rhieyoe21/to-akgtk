import { NextResponse } from "next/server";

export function response(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export function fail(message, status = 400) {
  return response({ error: message }, status);
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || new URL(request.url).host;
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProto ? `${forwardedProto.replace(/:$/, "")}:` : new URL(request.url).protocol;
    return originUrl.host.toLowerCase() === requestHost.toLowerCase() && originUrl.protocol === requestProtocol;
  }
  catch { return false; }
}

export async function readJson(request) {
  try { return await request.json(); }
  catch { return null; }
}

export function isJsonRequest(request) {
  return request.headers.get("content-type")?.toLowerCase().includes("application/json") || false;
}

export async function readRequestBody(request) {
  if (isJsonRequest(request)) return readJson(request);
  try { return Object.fromEntries((await request.formData()).entries()); }
  catch { return null; }
}

export function redirectAfterAuth(request, path) {
  const base = process.env.APP_URL || request.headers.get("origin") || new URL(request.url).origin;
  const result = NextResponse.redirect(new URL(path, base), 303);
  result.headers.set("Cache-Control", "no-store, max-age=0");
  return result;
}

export function cleanText(value, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function positivePage(value, max = 100000) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, max) : 1;
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch { return ""; }
}
