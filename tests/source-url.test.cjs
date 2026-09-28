const { test } = require("node:test");
const assert = require("node:assert/strict");
const { findGroundedCitation, normalizeDirectSourceUrl } = require("../lib/source-url.cjs");

test("accepts a direct URL to an article and preserves its full path", () => {
  assert.equal(
    normalizeDirectSourceUrl("https://kemenag.go.id/artikel/penguatan-madrasah"),
    "https://kemenag.go.id/artikel/penguatan-madrasah"
  );
});

test("rejects a domain homepage as a source", () => {
  assert.throws(() => normalizeDirectSourceUrl("https://kemenag.go.id"), /homepage/);
  assert.throws(() => normalizeDirectSourceUrl("https://kemenag.go.id/"), /homepage/);
  assert.throws(() => normalizeDirectSourceUrl("https://kemenag.go.id/?utm_source=gemini"), /homepage/);
});

test("accepts a direct dynamic article URL with a query identifier", () => {
  assert.equal(
    normalizeDirectSourceUrl("https://example.gov/article?id=123"),
    "https://example.gov/article?id=123"
  );
});

test("rejects invalid and non-HTTP source URLs", () => {
  assert.throws(() => normalizeDirectSourceUrl("not-a-url"), /tidak valid/);
  assert.throws(() => normalizeDirectSourceUrl("javascript:alert(1)"), /HTTP atau HTTPS/);
});

test("returns only a URL that matches a Google grounding citation", () => {
  const citations = [
    { web: { uri: "https://kemenag.go.id/artikel/asli?utm_source=search", title: "Artikel Asli" } }
  ];
  assert.deepEqual(findGroundedCitation("https://kemenag.go.id/artikel/asli", citations), {
    url: "https://kemenag.go.id/artikel/asli?utm_source=search",
    title: "Artikel Asli"
  });
  assert.equal(findGroundedCitation("https://kemenag.go.id/artikel/lain", citations), null);
});

test("with grounding enabled keeps cited questions and skips uncited ones without failing the batch", async () => {
  const { generateQuestions } = await import("../lib/gemini.js");
  const oldKey = process.env.GEMINI_API_KEY;
  const oldFetch = global.fetch;
  process.env.GEMINI_API_KEY = "test-key";

  const base = { options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "Pembahasan.", sourceTitle: "Judul" };
  const questions = [
    { ...base, prompt: "Soal bersitasi?", sourceUrl: "https://kemenag.go.id/artikel/bersitasi" },
    { ...base, prompt: "Soal tanpa sitasi?", sourceUrl: "https://kemenag.go.id/artikel/tanpa-sitasi" }
  ];
  global.fetch = async () => new Response(JSON.stringify({
    candidates: [{
      content: { parts: [{ text: JSON.stringify({ questions }) }] },
      finishReason: "STOP",
      groundingMetadata: { groundingChunks: [{ web: { uri: "https://kemenag.go.id/artikel/bersitasi", title: "Artikel Bersitasi" } }] }
    }]
  }), { status: 200 });

  try {
    const { questions: kept, skipped } = await generateQuestions({ category: "Manajerial", quantity: 2, useGoogleSearch: true });
    assert.equal(kept.length, 1);
    assert.equal(kept[0].sourceTitle, "Artikel Bersitasi");
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0].index, 2);
    assert.match(skipped[0].reason, /grounding/i);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  }
});

test("provides safe diagnostics when Gemini returns no question text", async () => {
  const { generateQuestions } = await import("../lib/gemini.js");
  const oldKey = process.env.GEMINI_API_KEY;
  const oldFetch = global.fetch;
  process.env.GEMINI_API_KEY = "test-key-that-must-never-appear-in-logs";
  global.fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [] }, finishReason: "MAX_TOKENS" }]
  }), { status: 200 });

  try {
    await assert.rejects(
      generateQuestions({ category: "Manajerial", quantity: 1 }),
      (error) => {
        assert.equal(error.message, "Gemini tidak mengembalikan soal.");
        assert.equal(error.details.candidateCount, 1);
        assert.deepEqual(error.details.finishReasons, ["MAX_TOKENS"]);
        assert.equal(error.details.responsePartCount, 0);
        assert.equal(JSON.stringify(error.details).includes(process.env.GEMINI_API_KEY), false);
        return true;
      }
    );
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  }
});

test("keeps questions with direct URLs and skips homepage-only sources instead of failing the batch", async () => {
  const { generateQuestions } = await import("../lib/gemini.js");
  const oldKey = process.env.GEMINI_API_KEY;
  const oldFetch = global.fetch;
  process.env.GEMINI_API_KEY = "test-key";

  const makeQuestion = (index) => ({
    prompt: `Pertanyaan ${index} tentang pengelolaan madrasah?`,
    options: ["Satu", "Dua", "Tiga", "Empat"],
    correctIndex: 0,
    explanation: "Pembahasan.",
    sourceTitle: "Judul",
    sourceUrl: "https://kemenag.go.id"
  });
  const questions = [makeQuestion(1), makeQuestion(2), makeQuestion(3)];
  questions[1].sourceUrl = "https://kemenag.go.id/artikel/sumber-lengkap";
  questions[2].options = ["Satu", "Dua", "Tiga"];

  global.fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ questions }) }] }, finishReason: "STOP" }]
  }), { status: 200 });

  try {
    const { questions: kept, skipped } = await generateQuestions({ category: "Manajerial", quantity: 3, difficulty: "sulit" });
    assert.equal(kept.length, 1);
    assert.equal(kept[0].difficulty, "sulit");
    assert.equal(kept[0].hideSource, true);
    assert.equal(kept[0].sourceUrl, "https://kemenag.go.id/artikel/sumber-lengkap");
    assert.equal(skipped.length, 2);
    assert.equal(skipped[0].index, 1);
    assert.match(skipped[0].reason, /homepage/i);
    assert.match(skipped[1].reason, /Struktur soal/i);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  }
});
