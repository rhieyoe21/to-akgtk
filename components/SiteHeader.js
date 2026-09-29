"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PRIVATE_NAV_PREFIXES = ["/dashboard", "/history", "/tryout"];

export default function SiteHeader() {
  const [user, setUser] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const hidePublicNav = PRIVATE_NAV_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    async function refreshSession() {
      const requestId = ++requestSequence;
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (active && requestId === requestSequence) setUser(res.ok ? data.user : null);
      } catch {
        if (active && requestId === requestSequence) setUser(null);
      } finally {
        if (active && requestId === requestSequence) setSessionLoaded(true);
      }
    }
    const refreshOnAuthChange = () => { setSessionLoaded(false); refreshSession(); };
    const refreshOnFocus = () => refreshSession();
    refreshSession();
    window.addEventListener("akgtk-auth-changed", refreshOnAuthChange);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      window.removeEventListener("akgtk-auth-changed", refreshOnAuthChange);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSessionLoaded(true);
    router.push("/");
    router.refresh();
  }

  return <header className="site-header"><div className="shell header-inner">
    <Link className="brand" href="/" aria-label="Ruang AKGTK beranda"><span className="brand-mark">R</span><span>Ruang AKGTK</span></Link>
    {/* {!hidePublicNav && <nav className="header-nav" aria-label="Navigasi utama"><Link href="/#kompetensi">Kompetensi</Link><Link href="/#tentang">Tentang simulasi</Link></nav>} */}
    <div className="header-actions">
      {user ? <>
        <span className="header-user">Halo, {user.name.split(" ")[0]}</span>
        <Link className="button secondary" href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>{user.role === "ADMIN" ? "Admin" : "Dashboard"}</Link>
        <button className="button ghost" onClick={logout}>Keluar</button>
      </> : sessionLoaded ? <><Link className="button secondary" href="/login">Masuk</Link><Link className="button" href="/register">Daftar</Link></> : <span className="header-auth-placeholder" aria-hidden="true" />}
    </div>
  </div></header>;
}
