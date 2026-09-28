import { CATEGORIES } from "./constants.js";
import sourceUrlTools from "./source-url.cjs";

const { findGroundedCitation, normalizeDirectSourceUrl } = sourceUrlTools;

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

function generationError(message, details) {
  const error = new Error(message);
  error.name = "GeminiGenerationError";
  error.details = details;
  return error;
}

function modelName() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

async function callGemini({ body, timeoutMs = 120000 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw generationError("Gemini API key belum dikonfigurasi di server.", { model: modelName() });
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName())}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    throw generationError("Koneksi ke Gemini gagal atau melewati batas waktu.", { model: modelName(), networkError: error.name || "NetworkError" });
  }
  let payload = {};
  let apiJsonParsed = true;
  try { payload = await res.json(); }
  catch { apiJsonParsed = false; }
  return { res, payload, apiJsonParsed };
}

export function validateGeneratedQuestion({ question, category, difficulty = "sedang", groundingChunks = [], requireCitation = false }) {
  const options = Array.isArray(question?.options) ? question.options.map((option) => String(option).trim()) : [];
  const prompt = String(question?.prompt || "").trim();
  if (!prompt || options.length !== 4 || options.some((option) => !option) || !Number.isInteger(question?.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
    return { ok: false, reason: "Struktur soal tidak lengkap (butuh teks, empat opsi, dan satu kunci valid)." };
  }

  let sourceUrl;
  try {
    sourceUrl = normalizeDirectSourceUrl(question.sourceUrl);
  } catch (error) {
    return { ok: false, reason: error.message };
  }

  let sourceTitle = String(question.sourceTitle || "").trim();
  if (requireCitation) {
    const citation = findGroundedCitation(sourceUrl, groundingChunks);
    if (!citation) return { ok: false, reason: "URL sumber tidak cocok dengan sitasi Google Search grounding." };
    sourceUrl = citation.url;
    sourceTitle = citation.title || sourceTitle;
  }

  return {
    ok: true,
    question: {
      category,
      difficulty,
      prompt,
      options,
      correctIndex: question.correctIndex,
      explanation: String(question.explanation || "").trim(),
      sourceUrl,
      sourceTitle,
      hideSource: true,
      generatedByAI: true
    }
  };
}

const DIFFICULTY_GUIDE = {
  mudah: "Tingkat MUDAH: uji pemahaman/ingatan dasar terhadap konsep utama.",
  sedang: "Tingkat SEDANG: uji penerapan konsep pada situasi nyata madrasah.",
  sulit: "Tingkat SULIT: uji analisis/evaluasi dan pengambilan keputusan yang menuntut penalaran.",
  campuran: "Tingkat CAMPURAN: variasikan soal pada tingkat mudah, sedang, dan sulit secara seimbang."
};

export async function generateQuestions({ category, quantity, maxQuantity = 50, focus = "", useGoogleSearch = false, difficulty = "sedang", existingPrompts = [] }) {
  if (!process.env.GEMINI_API_KEY) throw new Error("Gemini API key belum dikonfigurasi di server.");
  if (!CATEGORIES.includes(category)) throw new Error("Kompetensi tidak valid.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) throw new Error(`Jumlah soal harus 1–${maxQuantity} per permintaan.`);

  const groundingInstructions = useGoogleSearch
    ? "Google Search grounding AKTIF. Lakukan pencarian web untuk setiap soal, gunakan hanya artikel/dokumen spesifik dari hasil pencarian yang benar-benar menjadi bukti, dan isi sourceUrl dengan URI salah satu sumber yang dikembalikan Google Search grounding secara persis. Jangan membuat atau menebak URL."
    : "Google Search grounding tidak diaktifkan. Gunakan pengetahuan yang dapat dirujuk dan jangan mengarang URL.";
  const difficultyInstructions = DIFFICULTY_GUIDE[difficulty] || DIFFICULTY_GUIDE.sedang;
  const duplicateHints = [...new Set(existingPrompts.map((item) => String(item || "").trim().slice(0, 120)).filter(Boolean))].slice(0, 12);
  const duplicateSection = duplicateHints.length
    ? `Jangan meniru atau mengulang soal-soal berikut yang sudah ada di bank soal (buat topik, sudut pandang, atau skenario berbeda):\n${duplicateHints.map((item, index) => `   ${index + 1}. ${item}`).join("\n")}`
    : "Jangan mengulang soal yang sudah umum dipakai; variasikan topik dan skenario.";
  const prompt = `Buat tepat ${quantity} soal pilihan ganda berbahasa Indonesia untuk latihan kompetensi Kepala Madrasah pada kategori "${category}". Fokus tambahan: ${focus || "kompetensi umum sesuai kategori"}.\n\nSoal harus orisinal dan tidak mengklaim sebagai soal asli AKGTK. Setiap soal memiliki tepat 4 opsi dan hanya satu jawaban benar.\n\nATURAN FAKTA DAN SUMBER WAJIB UNTUK SETIAP SOAL:\n1. Soal, kunci jawaban, dan pembahasan harus berdasarkan fakta atau data dari sumber daring yang valid dan bisa diverifikasi. Jangan menyajikan dugaan sebagai fakta.\n2. Sertakan URL tautan aktif yang dapat dikunjungi langsung menuju sumber spesifik berupa artikel, halaman peraturan, jurnal ilmiah, atau dokumen asli yang mendukung soal. Prioritaskan situs resmi, jurnal ilmiah, atau media kredibel/terverifikasi, misalnya domain .go.id, .edu, atau situs berita terverifikasi.\n3. Jangan gunakan tautan fiktif, URL hasil karangan, atau informasi sumber yang dihalusinasi. Jangan hanya memberikan URL domain, homepage, halaman daftar, atau hasil pencarian; berikan tautan langsung/canonical ke artikel atau dokumen aslinya.\n4. Wajib berupa URL lengkap dengan path spesifik (bukan hanya domain atau akar situs), memakai host yang benar-benar ada dan populer, dan mengarah ke satu halaman/artikel/dokumen. Contoh bentuk yang benar: https://kemenag.go.id/berita/... , https://jdih.kemenag.go.id/... , https://www.kemdikbud.go.id/main/blog/... , https://scholar.google.com/... . Jangan mengarang host, slug, nomor, atau path.\n5. Isi sourceTitle dengan judul asli artikel, peraturan, jurnal, atau dokumen yang ditautkan.\n6. Jika URL aktif dan sumber spesifik tidak dapat dipastikan, jangan mengarangnya. Pilih fakta/topik lain yang memiliki rujukan valid dan bisa diverifikasi.\n7. ${groundingInstructions}\n\nATURAN KUALITAS OPSI JAWABAN:\n8. Semua opsi harus masuk akal dan layak dipilih; jangan ada opsi yang jelas, konyol, atau sengaja salah. Distraktor harus mencerminkan miskonsepsi umum sehingga siswa perlu memahami materi, bukan sekadar mengenali opsi yang salah.\n9. Buat opsi homogen: panjang, struktur kalimat, dan tingkat spesifikasinya serupa. Tidak boleh ada opsi yang lebih menonjol/lebih lengkap daripada opsi lain. Hanya satu opsi yang paling tepat.\n\nATURAN VARIASI DAN ANTI-DUPLIKAT:\n10. ${difficultyInstructions}\n11. Setiap soal harus berbeda secara subtansi; dilarang membuat soal yang sama persis atau sangat mirip, baik di dalam batch ini maupun dengan bank soal. ${duplicateSection}\n\nKembalikan JSON saja dalam bentuk {"questions":[{"prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"...","sourceUrl":"https://situs-resmi.go.id/artikel/asli","sourceTitle":"Judul asli sumber"}]}. correctIndex dimulai dari 0.`;

  const { res, payload, apiJsonParsed } = await callGemini({
    body: {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(useGoogleSearch ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: { responseMimeType: "application/json", temperature: 0.65 }
    }
  });

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const candidate = candidates[0];
  const parts = candidate?.content?.parts || [];
  const text = parts.map((part) => part.text || "").join("");
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
  const requireCitation = useGoogleSearch && groundingChunks.length > 0;
  const diagnostics = {
    model: modelName(),
    httpStatus: res.status,
    candidateCount: candidates.length,
    finishReasons: candidates.map((item) => item.finishReason).filter(Boolean),
    promptBlockReason: payload.promptFeedback?.blockReason || null,
    apiJsonParsed,
    responsePartCount: parts.length,
    responseTextLength: text.length,
    groundingSourceCount: groundingChunks.length,
    groundingRequested: useGoogleSearch,
    groundingUnavailable: useGoogleSearch && groundingChunks.length === 0
  };
  if (!res.ok) throw generationError(payload.error?.message || "Gemini gagal membuat soal.", diagnostics);
  if (!text) throw generationError("Gemini tidak mengembalikan soal.", diagnostics);
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw generationError("Respons Gemini bukan JSON yang valid.", diagnostics); }
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw generationError("Gemini tidak mengembalikan daftar soal.", { ...diagnostics, returnedQuestionCount: Array.isArray(parsed.questions) ? parsed.questions.length : 0, requestedQuestionCount: quantity });
  }

  const questions = [];
  const skipped = [];
  parsed.questions.forEach((question, index) => {
    const result = validateGeneratedQuestion({ question, category, difficulty, groundingChunks, requireCitation });
    if (result.ok) questions.push(result.question);
    else skipped.push({ index: index + 1, prompt: String(question?.prompt || "").slice(0, 120), reason: result.reason });
  });

  return { questions, skipped, diagnostics };
}

export async function verifySourceEvidence({ question, correctOption, explanation, pageTitle = "", pageText = "" }) {
  const excerpt = String(pageText || "").slice(0, 6000);
  if (!excerpt) return { supported: null, reason: "Isi halaman tidak tersedia untuk verifikasi." };
  const prompt = `Anda memverifikasi apakah isi halaman web mendukung sebuah soal pilihan ganda. Jawab hanya dengan JSON.\n\nJUDUL HALAMAN: ${pageTitle || "(tidak tersedia)"}\n\nKUTIPAN HALAMAN:\n${excerpt}\n\nSOAL: ${question}\nJAWABAN BENAR: ${correctOption}\nPEMBAHASAN: ${explanation || "(tidak ada)"}\n\nApakah halaman ini benar-benar mendukung soal, jawaban benar, dan pembahasan di atas? Kembalikan JSON: {"supported": true|false, "confidence": "low"|"medium"|"high", "evidence": "kutipan singkat dari halaman yang mendukung", "reason": "penjelasan singkat"}. Jika halaman tidak memuat bukti yang relevan, isi supported=false.`;
  const { res, payload } = await callGemini({
    body: {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    },
    timeoutMs: 45000
  });
  if (!res.ok) return { supported: null, reason: payload.error?.message || "Verifikasi bukti gagal." };
  const text = (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("");
  if (!text) return { supported: null, reason: "Verifikasi bukti tidak mengembalikan hasil." };
  try {
    const parsed = JSON.parse(text);
    return {
      supported: parsed.supported === true ? true : parsed.supported === false ? false : null,
      confidence: parsed.confidence || null,
      evidence: String(parsed.evidence || "").slice(0, 500),
      reason: String(parsed.reason || "").slice(0, 500)
    };
  } catch {
    return { supported: null, reason: "Hasil verifikasi bukti bukan JSON yang valid." };
  }
}
