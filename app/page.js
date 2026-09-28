import Link from "next/link";
import { CATEGORIES, DISCLAIMER } from "@/lib/constants";

const descriptions = [
  "Perencanaan, pengelolaan, dan pengambilan keputusan di madrasah.",
  "Pendampingan pembelajaran dan peningkatan mutu proses belajar.",
  "Inovasi, kreativitas, dan pengembangan potensi madrasah.",
  "Sikap menghargai perbedaan dan menjaga harmoni dalam keberagaman."
];

export default function HomePage() {
  return <main>
    <section className="hero"><div className="shell hero-grid">
      <div className="hero-copy"><div className="eyebrow">Belajar • Berlatih • Bertumbuh</div>
        <h1>Siapkan langkah menjadi pemimpin madrasah.</h1>
        <p>Latihan AKGTK Kepala Madrasah yang membantu Anda memahami kompetensi, mengukur kesiapan, dan belajar dari setiap jawaban.</p>
        <div className="hero-actions"><Link className="button" href="/register">Mulai latihan</Link><a className="button secondary" href="#kompetensi">Kenali kompetensinya</a></div>
      </div>
      <div className="hero-art" aria-label="Ilustrasi ringkasan latihan">
        <div className="art-panel"><div className="art-panel-top"><span>Ruang latihan</span><span>AKGTK</span></div><div className="art-number">80 soal</div><div className="art-label">Empat kompetensi Kepala Madrasah</div><div className="art-progress"><span /></div></div>
        <div className="art-side-note">Belajar<br />dari setiap<br />langkah</div>
      </div>
    </div></section>
    <div className="shell"><div className="disclaimer"><strong>Catatan penting.</strong> {DISCLAIMER}</div></div>
    <section className="feature-section" id="kompetensi"><div className="shell">
      <div className="section-head"><h2>Empat ruang kompetensi</h2><p>Latihan disusun mengikuti komposisi kompetensi Kepala Madrasah.</p></div>
      <div className="feature-grid">{CATEGORIES.map((category, index) => <article className="feature" key={category}><div className="feature-mark">{["⌂", "⌁", "✳", "◉"][index]}</div><strong>{category}</strong><p>{descriptions[index]}</p></article>)}</div>
    </div></section>
    <section id="tentang" className="shell" style={{ paddingBottom: 72 }}><div className="section-head"><h2>Latihan dengan ritme Anda</h2><p>Mulai dari simulasi singkat atau kerjakan tryout penuh. Ulas kembali jawaban dan sumbernya kapan saja.</p></div></section>
  </main>;
}
