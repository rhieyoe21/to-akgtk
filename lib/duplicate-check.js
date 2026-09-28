export function normalizePrompt(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
    .trim();
}

function tokenSet(value) {
  return new Set(normalizePrompt(value).split(" ").filter((word) => word.length >= 3));
}

export function jaccardSimilarity(a, b) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;
  return intersection / (setA.size + setB.size - intersection);
}

export function findDuplicate(prompt, existingPrompts, threshold = 0.8) {
  const normalized = normalizePrompt(prompt);
  if (!normalized) return { duplicate: false, similarity: 0, match: null };
  for (const candidate of existingPrompts) {
    if (normalizePrompt(candidate) === normalized) return { duplicate: true, similarity: 1, match: candidate };
    const score = jaccardSimilarity(prompt, candidate);
    if (score >= threshold) return { duplicate: true, similarity: score, match: candidate };
  }
  return { duplicate: false, similarity: 0, match: null };
}
