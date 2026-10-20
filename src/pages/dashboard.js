export function dashboard(ctx) {
  const {
    mins,
    data,
    filter,
    stats,
    monthNow,
    streak,
    isRest,
    chart,
    tasksHTML,
    button,
    badge,
    empty,
    esc,
    today,
    schedule,
    categories,
  } = ctx;
  const s = stats(),
    m = monthNow();
  const day = schedule[new Date().getDay()];
  const due = data.errorLogs.filter((e) => e.review <= today());
  return `<section class="hero"><div><span class="eyebrow">YOUR JOURNEY TO BTKV</span><h1>Langkah kecil hari ini.<br><em>Masa depan yang berarti.</em></h1><p>Disiplin hari ini, spesialis esok hari.</p><div class="hero-actions">${button("▶ Mulai Belajar", "start-study", "gold")}${button("Lanjutkan Sesi ↗", "timer", "ghost")}</div><span class="hero-foot">20 OKT 2026 <span>────────</span> 19 OKT 2027 · ROADMAP PRIBADI</span></div><div class="hero-art"><div class="orbit o1"></div><div class="orbit o2"></div><svg viewBox="0 0 240 180" aria-hidden="true"><path d="M0 95h48l12-25 18 66 22-108 22 67h27l12-19 14 34 12-15h53" fill="none" stroke="#f4c247" stroke-width="3"/><path d="M120 155C14 95 49 20 99 52l21 18 21-18c50-32 85 43-21 103Z" fill="none" stroke="#ffffff44" stroke-width="2"/></svg><span>FOCUS · CONSISTENCY · GROWTH</span></div></section><div class="stat-grid"><article class="stat"><span>◷ Waktu belajar hari ini</span><strong>${s.minutes}<small> / 120 menit</small></strong><div class="meter"><i style="width:${Math.min(100, (s.minutes / 120) * 100)}%"></i></div><small>${s.sessions} sesi selesai</small></article><article class="stat"><span>♨ Streak belajar</span><strong>${streak()}<small> hari</small></strong><small>${s.days} hari aktif · istirahat terjadwal aman</small></article><article class="stat"><span>◎ Akurasi soal</span><strong>${s.accuracy === null ? "—" : s.accuracy + "%"}<small> jawaban benar</small></strong><small>${data.attempts.length} jawaban tersimpan</small></article><article class="stat"><span>⚑ Progres roadmap</span><strong>${s.roadmap}<small> % selesai</small></strong><small>${m ? "Bulan " + m.month + " · Minggu " + Math.max(1, Math.ceil((Date.now() - new Date(data.roadmapMonths[0].start + "T00:00:00").getTime()) / 604800000)) : "Di luar rentang roadmap"}</small></article></div><div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><span class="eyebrow">DAILY FOCUS</span><h2>Rencana hari ini</h2></div>${badge(day[0])}</div><p class="muted">${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · ${isRest(new Date()) ? "Istirahat terjadwal, review opsional" : "Target 120 menit"}</p>${tasksHTML()}<div class="panel-footer">${button("+ Siapkan jadwal hari ini", "generate")}${button("Buka planner ↗", "planner", "text-button")}</div></section><section class="panel"><div class="panel-heading"><div><span class="eyebrow">STAY CONSISTENT</span><h2>Ritme belajar</h2></div><span class="muted">7 hari terakhir</span></div>${chart()}<div class="legend"><i></i> Waktu aktual · target 120 menit/hari</div></section><section class="panel roadmap-preview"><div class="panel-heading"><h2>Perjalanan 12 bulan</h2>${button("Lihat roadmap ↗", "roadmap", "text-button")}</div><div class="mini-timeline">${data.roadmapMonths
    .slice(0, 4)
    .map(
      (m) =>
        `<button data-action="month:${m.id}"><span class="month-dot ${m.status === "Selesai" ? "complete" : ""}">${String(m.month).padStart(2, "0")}</span><small>BULAN ${m.month}</small><strong>${esc(m.title)}</strong><span class="muted">${m.start} → ${m.target}</span></button>`,
    )
    .join(
      "",
    )}</div></section><section class="panel"><div class="panel-heading"><h2>Waktunya review</h2>${badge(`${due.length} jatuh tempo`, "amber")}</div>${
    due.length
      ? due
          .slice(0, 3)
          .map((e) => `<p>${esc(e.title)} <small>${esc(e.cause)}</small></p>`)
          .join("")
      : empty(
          "Belum ada materi jatuh tempo. Kesalahan adalah bagian dari proses belajar.",
        )
  }<div class="panel-footer">${button("↺ Review Kesalahan Hari Ini", "review-errors")}</div></section><section class="panel"><h2>Enam fokus, satu tujuan</h2><div class="category-list">${categories
    .map((c, i) => {
      const ts = data.topics.filter((t) => t.category === c);
      const done =
        c === "Administration"
          ? data.documents.filter((d) => d.status === "Lengkap").length
          : ts.filter((t) => t.status === "Selesai").length;
      return `<a href="#${encodeURIComponent(c)}"><span class="category-icon c${i}">${["∑", "♡", "◇", "Aa", "⌕", "▤"][i]}</span><div><strong>${c}</strong><small>${done} / ${ts.length || data.documents.length} ${ts.length ? "topik selesai" : "dokumen lengkap"}</small></div><span>↗</span></a>`;
    })
    .join(
      "",
    )}</div></section><section class="panel"><h2>Aktivitas terakhir</h2>${
    data.studySessions.length
      ? data.studySessions
          .slice()
          .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
          .slice(0, 4)
          .map(
            (s) =>
              `<div class="activity"><span class="activity-dot"></span><div><strong>${esc(s.category)}</strong><small>${mins(s.seconds)} menit · ${s.status === "completed" ? "Selesai" : "Diakhiri sebagian"} · ${esc(s.date)}</small></div></div>`,
          )
          .join("")
      : empty(
          "Perjalanan Anda dimulai di sini. Mulai sesi pertama untuk mencatat aktivitas.",
        )
  }<div class="panel-footer">${button("+ Tambah catatan", "note-new")}${button("Evaluasi mingguan", "review-new", "text-button")}</div></section></div>`;
}
