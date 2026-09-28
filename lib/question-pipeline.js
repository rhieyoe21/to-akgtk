import { generateQuestions, verifySourceEvidence } from "./gemini.js";
import { auditSourceUrl, mapWithConcurrency, relevanceScore } from "./source-audit.js";
import { findDuplicate } from "./duplicate-check.js";

/**
 * Generates questions and validates each source with a live HTTP audit so the bank
 * only stores reachable, direct article/document links. Google Search grounding is
 * optional: when it is unavailable the audit still protects source validity.
 * Duplicate prompts are rejected against the existing bank and within the batch.
 */
export async function generateAuditedQuestions(options) {
  const {
    sourceAudit = true,
    sourceEvidenceCheck = false,
    auditConcurrency = 4,
    evidenceConcurrency = 2,
    existingPrompts = [],
    duplicateThreshold = 0.82
  } = options;

  const { questions, skipped, diagnostics } = await generateQuestions(options);
  if (!questions.length) return { questions, skipped, diagnostics };

  // Drop duplicates before spending network/API calls on auditing them.
  const uniquePool = [];
  const seenPrompts = [...existingPrompts];
  for (const question of questions) {
    const duplicate = findDuplicate(question.prompt, seenPrompts, duplicateThreshold);
    if (duplicate.duplicate) {
      skipped.push({ prompt: question.prompt.slice(0, 120), reason: `Soal duplikat atau sangat mirip dengan soal lain (kemiripan ${Math.round(duplicate.similarity * 100)}%).` });
      continue;
    }
    uniquePool.push(question);
    seenPrompts.push(question.prompt);
  }
  if (!uniquePool.length) return { questions: [], skipped, diagnostics };

  const audited = await mapWithConcurrency(uniquePool, auditConcurrency, async (question) => {
    if (!sourceAudit) return { question, audit: null, relevance: null };
    const audit = await auditSourceUrl(question.sourceUrl);
    const relevance = audit.ok && audit.text
      ? relevanceScore({ pageText: audit.text, question: question.prompt, correctOption: question.options[question.correctIndex], explanation: question.explanation })
      : null;
    return { question, audit, relevance };
  });

  const survivors = [];
  for (const item of audited) {
    if (item.audit && !item.audit.ok) {
      skipped.push({ prompt: item.question.prompt.slice(0, 120), reason: `Sumber tidak lolos audit: ${item.audit.reason}` });
      continue;
    }
    if (item.audit?.ok && item.relevance !== null && item.relevance < item.audit.minRelevance) {
      skipped.push({ prompt: item.question.prompt.slice(0, 120), reason: `Isi sumber tidak cukup relevan dengan soal (skor ${item.relevance}).` });
      continue;
    }
    survivors.push({
      question: {
        ...item.question,
        sourceUrl: item.audit?.finalUrl || item.question.sourceUrl,
        sourceTitle: item.question.sourceTitle || item.audit?.title || ""
      },
      audit: item.audit
    });
  }

  if (!sourceEvidenceCheck || !survivors.length) {
    return { questions: survivors.map((item) => item.question), skipped, diagnostics };
  }

  const verified = await mapWithConcurrency(survivors, evidenceConcurrency, async (item) => {
    if (!item.audit?.text) return { item, verdict: { supported: null } };
    try {
      const verdict = await verifySourceEvidence({
        question: item.question.prompt,
        correctOption: item.question.options[item.question.correctIndex],
        explanation: item.question.explanation,
        pageTitle: item.audit.title,
        pageText: item.audit.text
      });
      return { item, verdict };
    } catch {
      return { item, verdict: { supported: null } };
    }
  });

  const finalQuestions = [];
  for (const { item, verdict } of verified) {
    if (verdict.supported === false) {
      skipped.push({ prompt: item.question.prompt.slice(0, 120), reason: `Bukti halaman tidak mendukung soal: ${verdict.reason || "tidak ada bukti relevan"}` });
      continue;
    }
    finalQuestions.push(item.question);
  }

  return { questions: finalQuestions, skipped, diagnostics };
}
