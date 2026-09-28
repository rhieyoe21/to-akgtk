"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/constants";

export default function AdminStats({ initial }) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetch("/api/admin/stats", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => { if (active && data && !data.error) setStats({ participants: data.participants, submitted: data.submitted, questionCounts: data.questionCounts }); })
        .catch(() => {});
    };
    window.addEventListener("akgtk-admin-changed", refresh);
    return () => { active = false; window.removeEventListener("akgtk-admin-changed", refresh); };
  }, []);

  const counts = stats?.questionCounts || {};
  const totalQuestions = CATEGORIES.reduce((sum, category) => sum + (counts[category] || 0), 0);
  return <>
    <div className="stats-row"><div className="stat-box"><strong>{stats?.participants ?? 0}</strong><span>Peserta terdaftar</span></div><div className="stat-box"><strong>{stats?.submitted ?? 0}</strong><span>Tryout selesai</span></div><div className="stat-box"><strong>{totalQuestions}</strong><span>Soal aktif</span></div></div>
    <div className="dashboard-grid" style={{ marginBottom: 22 }}>{CATEGORIES.map((category) => <div className="panel panel-pad" key={category}><span className="admin-note">{category}</span><div style={{ fontFamily: "Literata, Georgia, serif", fontSize: 30 }}>{counts[category] || 0}</div></div>)}</div>
  </>;
}
