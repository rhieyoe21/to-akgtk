export const CATEGORIES = [
  "Manajerial",
  "Supervisi",
  "Kewirausahaan",
  "Moderasi Beragama"
];

export const MODES = {
  FULL: { label: "Tryout penuh", count: 80, durationSec: 120 * 60, quotas: [36, 12, 12, 20] },
  SHORT: { label: "Tryout singkat", count: 40, durationSec: 60 * 60, quotas: [18, 6, 6, 10] }
};

export const DISCLAIMER = "Aplikasi ini hanya untuk pembelajaran dan simulasi. Soal tidak mencerminkan soal asli AKGTK yang akan berlangsung.";

export const DIFFICULTIES = ["mudah", "sedang", "sulit", "campuran"];

export const DIFFICULTY_LABELS = {
  mudah: "Mudah",
  sedang: "Sedang",
  sulit: "Sulit",
  campuran: "Campuran"
};

export function normalizeDifficulty(value) {
  const candidate = String(value || "").toLowerCase().trim();
  return DIFFICULTIES.includes(candidate) ? candidate : "sedang";
}
