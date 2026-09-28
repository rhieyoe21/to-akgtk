function normalizeDirectSourceUrl(value) {
  const sourceUrl = String(value || "").trim();
  let parsedUrl;
  try { parsedUrl = new URL(sourceUrl); }
  catch { throw new Error("Gemini menghasilkan URL sumber yang tidak valid; buat ulang soal."); }

  if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error("URL sumber harus HTTP atau HTTPS.");
  const hasSpecificPath = parsedUrl.pathname.split("/").filter(Boolean).length > 0;
  const hasSpecificQuery = [...parsedUrl.searchParams.keys()].some((key) => !/^(utm_.+|ref|source|fbclid|gclid)$/i.test(key));
  if (!hasSpecificPath && !hasSpecificQuery) {
    throw new Error("URL sumber hanya menuju domain/homepage. Gemini harus memberikan tautan langsung ke artikel atau dokumen aslinya; buat ulang soal.");
  }
  return parsedUrl.toString();
}

function citationKey(value) {
  const parsedUrl = new URL(normalizeDirectSourceUrl(value));
  parsedUrl.hash = "";
  for (const key of [...parsedUrl.searchParams.keys()]) {
    if (/^(utm_.+|ref|source|fbclid|gclid)$/i.test(key)) parsedUrl.searchParams.delete(key);
  }
  parsedUrl.searchParams.sort();
  const pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";
  return `${parsedUrl.protocol}//${parsedUrl.host.toLowerCase()}${pathname}${parsedUrl.search}`;
}

function findGroundedCitation(sourceUrl, groundingChunks) {
  let expectedKey;
  try { expectedKey = citationKey(sourceUrl); }
  catch { return null; }
  for (const chunk of groundingChunks || []) {
    const uri = chunk?.web?.uri;
    if (!uri) continue;
    try {
      if (citationKey(uri) === expectedKey) {
        return {
          url: normalizeDirectSourceUrl(uri),
          title: typeof chunk.web.title === "string" ? chunk.web.title.trim() : ""
        };
      }
    } catch { /* Ignore malformed or homepage-only grounding chunks. */ }
  }
  return null;
}

module.exports = { normalizeDirectSourceUrl, findGroundedCitation };
