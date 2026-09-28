const { test } = require("node:test");
const assert = require("node:assert/strict");

test("pipeline keeps live direct sources and skips dead ones without failing the batch", async () => {
  const { generateAuditedQuestions } = await import("../lib/question-pipeline.js");
  const oldKey = process.env.GEMINI_API_KEY;
  const oldFetch = global.fetch;
  process.env.GEMINI_API_KEY = "test-key";

  const base = { options: ["Supervisi klinis", "Rapat rutin", "Absensi", "Inventaris"], correctIndex: 0, explanation: "Supervisi klinis menekankan pembelajaran.", sourceTitle: "Artikel" };
  const questions = [
    { ...base, prompt: "Bagaimana supervisi klinis pembelajaran di madrasah?", sourceUrl: "https://example.com/artikel/supervisi" },
    { ...base, prompt: "Apa indikator keberhasilan pendampingan guru oleh kepala madrasah?", sourceUrl: "https://example.com/sumber-mati" }
  ];
  const pageText = "supervisi klinis pembelajaran madrasah kurikulum kompetensi pendampingan guru ".repeat(20);

  global.fetch = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input?.url || input);
    if (url.includes("generativelanguage.googleapis.com")) {
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ questions }) }] }, finishReason: "STOP" }] }), { status: 200 });
    }
    if (url.includes("sumber-mati")) {
      return new Response("<html><title>Error</title><body>gagal</body></html>", { status: 503, headers: { "content-type": "text/html" } });
    }
    return new Response(`<html><head><title>Artikel Supervisi</title></head><body>${pageText}</body></html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  };

  try {
    const { questions: kept, skipped } = await generateAuditedQuestions({ category: "Manajerial", quantity: 2, sourceAudit: true, sourceEvidenceCheck: false });
    assert.equal(kept.length, 1);
    assert.equal(kept[0].sourceUrl, "https://example.com/artikel/supervisi");
    assert.equal(skipped.length, 1);
    assert.match(skipped[0].reason, /audit/i);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  }
});
