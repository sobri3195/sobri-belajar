export function progress(ctx) {
  const { mins, data, filter, stats, chart, sessionsHTML, button, empty, esc } =
    ctx;
  const s = stats();
  const tasks = data.studyTasks;
  return `<div class="stat-grid"><article class="stat"><span>Aktivitas · waktu total</span><strong>${mins(data.studySessions.reduce((a, s) => a + Number(s.seconds || 0), 0))}<small> menit</small></strong></article><article class="stat"><span>Tugas selesai</span><strong>${tasks.length ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0}%</strong><small>${tasks.filter((t) => t.done).length}/${tasks.length} tugas</small></article><article class="stat"><span>Penguasaan · akurasi</span><strong>${s.accuracy === null ? "—" : s.accuracy + "%"}</strong></article><article class="stat"><span>Topik selesai</span><strong>${data.topics.filter((t) => t.status === "Selesai").length}</strong></article></div><div class="two-col"><section class="panel"><h2>Waktu belajar mingguan</h2>${chart()}</section><section class="panel"><h2>Ringkasan 30 hari</h2>${chart(30)}</section><section class="panel"><h2>Penguasaan & pengulangan</h2>${
    data.topics
      .filter((t) => t.mastery > 0 || t.status === "Perlu pengulangan")
      .map(
        (t) =>
          `<p>${esc(t.title)} · Recall ${t.mastery}/5 · ${esc(t.status)}</p>`,
      )
      .join("") || empty("Belum ada evaluasi materi.")
  }<h3>Tren akurasi (10 jawaban terakhir)</h3><p>${
    data.attempts
      .slice(-10)
      .map((a) => (a.correct ? "●" : "○"))
      .join(" ") || "Belum ada jawaban."
  }</p></section><section class="panel"><div class="panel-heading"><h2>Evaluasi berkala</h2>${button("+ Evaluasi", "review-new")}</div>${[...data.weeklyReviews, ...data.monthlyReviews].map((r) => `<article class="note"><strong>${esc(r.period)} · ${esc(r.date)}</strong><p class="preserve">${esc(r.body)}</p></article>`).join("") || empty("Refleksikan apa yang berjalan baik dan rencanakan langkah berikutnya.")}</section></div><section class="panel"><h2>Hasil mini-tryout</h2>${
    data.settings
      .filter((s) => s.kind === "quiz-result")
      .map(
        (r) =>
          `<p>${esc(r.date)} · ${r.correct}/${r.answered} jawaban benar · ${r.answered ? Math.round((r.correct / r.answered) * 100) + "%" : "Belum ada jawaban"} · ${r.seconds} detik</p>`,
      )
      .join("") || empty("Belum ada mini-tryout selesai.")
  }</section><section class="panel"><h2>Semua sesi</h2>${sessionsHTML()}</section>`;
}
