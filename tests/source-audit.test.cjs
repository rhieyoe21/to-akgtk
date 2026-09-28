const { test } = require("node:test");
const assert = require("node:assert/strict");

test("relevanceScore is high when the page repeats the question terms", async () => {
  const { relevanceScore } = await import("../lib/source-audit.js");
  const page = "madrasah mengembangkan kurikulum berbasis kompetensi dan supervisi pembelajaran berkelanjutan";
  const high = relevanceScore({ pageText: page, question: "Bagaimana supervisi pembelajaran di madrasah?", correctOption: "mengembangkan kurikulum berbasis kompetensi", explanation: "supervisi pembelajaran berkelanjutan" });
  const low = relevanceScore({ pageText: "resep kue lapis dan cara membuatnya", question: "Bagaimana supervisi pembelajaran di madrasah?", correctOption: "mengembangkan kurikulum berbasis kompetensi", explanation: "supervisi pembelajaran berkelanjutan" });
  assert.ok(high >= 0.5, `expected high relevance, got ${high}`);
  assert.ok(low <= 0.2, `expected low relevance, got ${low}`);
});

test("assessSourceContent flags soft 404 and thin pages", async () => {
  const { assessSourceContent } = await import("../lib/source-audit.js");
  assert.equal(assessSourceContent({ contentType: "text/html; charset=utf-8", title: "404 Not Found", text: "Halaman tidak ditemukan" }).ok, false);
  assert.equal(assessSourceContent({ contentType: "text/html", title: "Artikel", text: "terlalu pendek" }).ok, false);
  assert.equal(assessSourceContent({ contentType: "application/json", title: "", text: "" }).ok, false);
  assert.equal(assessSourceContent({ contentType: "text/html", title: "Artikel Asli", text: "x".repeat(400) }).ok, true);
});

test("auditSourceUrl blocks private and localhost targets (SSRF protection)", async () => {
  const { auditSourceUrl } = await import("../lib/source-audit.js");
  const privateResult = await auditSourceUrl("http://127.0.0.1/admin");
  assert.equal(privateResult.ok, false);
  const localhostResult = await auditSourceUrl("http://localhost/internal");
  assert.equal(localhostResult.ok, false);
  const metadataResult = await auditSourceUrl("http://169.254.169.254/latest/meta-data/");
  assert.equal(metadataResult.ok, false);
});
