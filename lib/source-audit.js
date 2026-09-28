import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const AUDIT_USER_AGENT = "Mozilla/5.0 (compatible; RuangAKGTK-SourceAudit/1.0; +https://github.com/rhieyoe21/to-akgtk)";
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "metadata.google.internal", "metadata"]);
const MAX_BYTES = 400000;

const STOPWORDS = new Set([
  "adalah", "akan", "atau", "bagi", "bahwa", "dalam", "dapat", "dari", "dengan", "harus", "jika", "juga",
  "karena", "kepala", "kepada", "ketika", "madrasah", "melalui", "mengenai", "mereka", "merupakan", "pada",
  "sebagai", "sebuah", "sehingga", "setiap", "suatu", "tentang", "tersebut", "terhadap", "untuk", "yang",
  "about", "akan", "based", "berdasarkan", "dilakukan", "maka", "oleh", "serta", "seorang", "tersedia",
  "jawaban", "pilihan", "pernyataan", "berikut", "benar", "salah", "paling", "tepat", "soal"
]);

function isPrivateAddress(address) {
  if (!address) return true;
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fe80") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("ff")) return true;
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

async function assertPublicHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host || BLOCKED_HOSTNAMES.has(host)) throw new Error("Host sumber tidak diizinkan.");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Alamat jaringan privat tidak diizinkan.");
    return;
  }
  let records;
  try { records = await lookup(host, { all: true }); }
  catch { throw new Error("Nama host sumber tidak dapat diselesaikan."); }
  if (!records.length) throw new Error("Nama host sumber tidak dapat diselesaikan.");
  if (records.some((record) => isPrivateAddress(record.address))) throw new Error("Alamat jaringan privat tidak diizinkan.");
}

async function readLimitedText(response, maxBytes = MAX_BYTES) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      text += decoder.decode(value, { stream: true });
      if (received >= maxBytes) { await reader.cancel(); break; }
    }
  } catch { /* Partial content is acceptable for auditing. */ }
  return text;
}

async function safeFetch(startUrl, { timeoutMs, maxRedirects = 5 }) {
  let current = new URL(startUrl);
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertPublicHost(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        headers: { "User-Agent": AUDIT_USER_AGENT, Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8" },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
    if (REDIRECT_STATUS.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) return { response, url: current };
      current = new URL(location, current);
      continue;
    }
    return { response, url: current };
  }
  throw new Error("Terlalu banyak pengalihan pada URL sumber.");
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim().slice(0, 300) : "";
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const SOFT_404_TITLE = /\b(404|not\s*found|page\s*not\s*found|tidak\s*ditemukan|halaman\s*tidak\s*ditemukan|kesalahan\s*404|error\s*404)\b/i;
const SOFT_404_BODY = /\b(404\s*not\s*found|page\s*not\s*found|halaman\s*(yang\s*)?anda\s*cari\s*tidak\s*ditemukan|halaman\s*tidak\s*ditemukan|tidak\s*ditemukan)\b/i;

function looksLikeSoftNotFound(title, text) {
  if (title && SOFT_404_TITLE.test(title)) return true;
  if (text && text.length < 3000 && SOFT_404_BODY.test(text.slice(0, 1500))) return true;
  return false;
}

function significantTerms(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !STOPWORDS.has(word));
}

export function relevanceScore({ pageText, question, correctOption, explanation }) {
  const haystack = (pageText || "").toLowerCase();
  if (!haystack) return null;
  const unique = [...new Set([...significantTerms(question), ...significantTerms(correctOption), ...significantTerms(explanation)])];
  if (unique.length < 3) return null;
  const matched = unique.filter((term) => haystack.includes(term)).length;
  return Math.round((matched / unique.length) * 100) / 100;
}

export async function auditSourceUrl(rawUrl, { timeoutMs = 12000, minRelevance = 0.12 } = {}) {
  let url;
  try { url = new URL(String(rawUrl || "").trim()); }
  catch { return { ok: false, reason: "URL sumber tidak valid." }; }
  if (!/^https?:$/.test(url.protocol)) return { ok: false, reason: "URL sumber harus HTTP atau HTTPS." };

  let response;
  let finalUrl;
  try {
    ({ response, url: finalUrl } = await safeFetch(url, { timeoutMs }));
  } catch (error) {
    if (error.name === "AbortError") return { ok: false, reason: "Sumber tidak merespons (timeout)." };
    return { ok: false, reason: error.message || "Sumber tidak dapat diakses." };
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const precheck = assessSourceContent({ status: response.status, contentType });
  if (!precheck.ok && precheck.fatal) {
    return { ...precheck, status: response.status, finalUrl: finalUrl.toString() };
  }
  const isPdf = contentType.includes("application/pdf");
  if (isPdf) {
    return { ok: true, status: response.status, finalUrl: finalUrl.toString(), finalHost: finalUrl.host, title: "", text: "", contentType, relevance: null, minRelevance };
  }

  const html = await readLimitedText(response);
  const title = extractTitle(html);
  const text = htmlToText(html);
  const finalAssessment = assessSourceContent({ status: response.status, contentType, title, text });
  if (!finalAssessment.ok) {
    return { ...finalAssessment, status: response.status, finalUrl: finalUrl.toString(), title };
  }
  return {
    ok: true,
    status: response.status,
    finalUrl: finalUrl.toString(),
    finalHost: finalUrl.host,
    title,
    text,
    contentType,
    relevance: null,
    minRelevance
  };
}

export function assessSourceContent({ status = 200, contentType = "", title = "", text = "" }) {
  const type = String(contentType || "").toLowerCase();
  const isHtml = type.includes("text/html") || type.includes("application/xhtml");
  const isPdf = type.includes("application/pdf");
  if (type && !isHtml && !isPdf) {
    return { ok: false, fatal: true, reason: "Sumber bukan halaman web atau PDF." };
  }
  if (status && (status < 200 || status >= 300)) {
    return { ok: false, fatal: true, reason: `Sumber mengembalikan status HTTP ${status}.` };
  }
  if (isPdf) return { ok: true, reason: null };
  if (looksLikeSoftNotFound(title, text)) {
    return { ok: false, reason: "Sumber tampak halaman 'tidak ditemukan' (soft 404)." };
  }
  if (!text || text.length < 200) {
    return { ok: false, reason: "Isi halaman sumber terlalu pendek untuk diverifikasi." };
  }
  return { ok: true, reason: null };
}

export async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
