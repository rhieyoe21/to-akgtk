import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

export const metadata = {
  title: "Ruang AKGTK — Simulasi AKGTK Kepala Madrasah",
  description: "Ruang belajar dan simulasi tryout AKGTK untuk kompetensi Kepala Madrasah."
};

// A request-scoped CSP nonce requires HTML to be rendered for each request.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return <html lang="id"><body><SiteHeader />{children}<footer className="site-footer"><div className="shell footer-inner"><span>Ruang AKGTK</span><span>Ruang latihan untuk tumbuh bersama.</span></div></footer></body></html>;
}
