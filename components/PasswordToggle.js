"use client";

export default function PasswordToggle({ visible, onToggle, label = "password" }) {
  return <button className="password-toggle" type="button" aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`} title={visible ? "Sembunyikan" : "Tampilkan"} aria-pressed={visible} onClick={onToggle}>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {visible
        ? <><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.4 5.1A9.7 9.7 0 0 1 12 4.8c5 0 8.5 3.4 9.8 7.2a11.6 11.6 0 0 1-3 4.3" /><path d="M6.2 6.2A11.4 11.4 0 0 0 2.2 12c1.3 3.8 4.8 7.2 9.8 7.2a10.3 10.3 0 0 0 4-.8" /></>
        : <><path d="M2.2 12C3.5 8.2 7 4.8 12 4.8s8.5 3.4 9.8 7.2c-1.3 3.8-4.8 7.2-9.8 7.2S3.5 15.8 2.2 12Z" /><circle cx="12" cy="12" r="3" /></>}
    </svg>
  </button>;
}
