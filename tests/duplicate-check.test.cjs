const { test } = require("node:test");
const assert = require("node:assert/strict");

test("findDuplicate flags identical and near-identical prompts", async () => {
  const { findDuplicate, jaccardSimilarity } = await import("../lib/duplicate-check.js");
  const existing = ["Bagaimana kepala madrasah menyusun rencana kerja berbasis data?"];
  assert.equal(findDuplicate(existing[0], existing).duplicate, true);
  const near = findDuplicate("Bagaimana kepala madrasah menyusun rencana kerja madrasah berbasis data?", existing);
  assert.equal(near.duplicate, true);
  assert.ok(jaccardSimilarity(existing[0], "Bagaimana kepala madrasah menyusun rencana kerja berbasis data?") === 1);
});

test("findDuplicate allows genuinely different prompts", async () => {
  const { findDuplicate } = await import("../lib/duplicate-check.js");
  const existing = ["Bagaimana kepala madrasah menyusun rencana kerja berbasis data?"];
  const result = findDuplicate("Apa indikator keberhasilan supervisi akademik di madrasah?", existing);
  assert.equal(result.duplicate, false);
});

test("findDuplicate catches duplicates within the same generated batch", async () => {
  const { findDuplicate } = await import("../lib/duplicate-check.js");
  const seen = [];
  const prompts = [
    "Apa fungsi moderasi beragama bagi kepala madrasah?",
    "Apa fungsi moderasi beragama bagi kepala madrasah?",
    "Bagaimana strategi kewirausahaan madrasah yang mandiri?"
  ];
  const kept = [];
  for (const prompt of prompts) {
    if (findDuplicate(prompt, seen).duplicate) continue;
    kept.push(prompt);
    seen.push(prompt);
  }
  assert.equal(kept.length, 2);
});
