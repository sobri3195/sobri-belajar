import { scoreRun, latestWrongQuestions } from "../services/lpdp-practice.js";
export function lpdpPractice(ctx) {
  const {
    data,
    button,
    badge,
    empty,
    options,
    esc,
    lpdpFilter = "Semua",
    lpdpDifficulty = "Semua",
  } = ctx;
  const questions = data.questions.filter((q) => q.category === "LPDP");
  const selected = questions.filter(
    (q) =>
      (lpdpFilter === "Semua" || q.subcategory === lpdpFilter) &&
      (lpdpDifficulty === "Semua" || q.difficulty === lpdpDifficulty),
  );
  const run = data.settings.find((s) => s.id === "lpdp-active-practice");
  const active = run?.status === "running";
  const q = active && data.questions.find((q) => q.id === run.ids[run.index]);
  const attempts = data.attempts.filter((a) => a.category === "LPDP");
  const attempt =
    q && attempts.find((a) => a.runId === run.runId && a.questionId === q.id);
  const wrong = latestWrongQuestions(selected, attempts);
  const summary = run && scoreRun(run, attempts);
  const results = data.settings
    .filter((s) => s.kind === "lpdp-result")
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  return `<section class="panel lpdp-practice" id="lpdp-practice"><div class="panel-heading"><div><span class="eyebrow">BANK LATIHAN LOKAL</span><h2>Latihan skolastik LPDP</h2></div>${badge("LATIHAN ORISINAL · BUKAN SOAL RESMI", "amber")}</div><p>30 soal verbal, numerik, dan penalaran logis. Estimasi waktu adalah target latihan internal. Filter berlaku untuk sesi baru. Soal dan pembahasan perlu verifikasi, bukan prediksi seleksi.</p><div class="toolbar"><label>Kategori soal LPDP<select id="lpdp-category" aria-label="Kategori soal LPDP">${options(["Semua", ...new Set(questions.map((q) => q.subcategory))], lpdpFilter)}</select></label><label>Kesulitan LPDP<select id="lpdp-difficulty" aria-label="Kesulitan LPDP">${options(["Semua", ...new Set(questions.map((q) => q.difficulty))], lpdpDifficulty)}</select></label><span class="muted">${selected.length} soal · estimasi ${Math.ceil(selected.reduce((sum, q) => sum + (q.estimatedSeconds || 90), 0) / 60)} menit</span></div><div class="actions">${button("Practice Mode", "lpdp-start-practice", "primary")}${button("Timed Practice", "lpdp-start-timed")}${button(`Review soal salah (${wrong.length})`, "lpdp-start-review")}${active ? button("Akhiri latihan", "lpdp-finish", "text-button") : ""}</div>${active ? `<div class="notice">${run.mode === "timed" ? "Timed Practice" : run.mode === "review" ? "Review kesalahan" : "Practice Mode"} · Soal ${run.index + 1}/${run.ids.length} · <strong id="lpdp-live-score">${summary.correct}/${summary.answered} jawaban benar</strong>${run.deadline ? '<p id="lpdp-countdown" role="timer"></p>' : "<p>Tanpa batas waktu. Kemajuan disimpan otomatis.</p>"}</div>` : ""}${q ? `<article class="question-active" data-lpdp-id="${esc(q.id)}"><div class="panel-heading">${badge(q.subcategory)}${badge(q.difficulty)}<small>${q.estimatedSeconds || 90} detik · ${esc(q.topic || "")}</small></div><h3>${esc(q.prompt)}</h3><form data-form="lpdp-answer">${q.options.map((o) => `<label class="answer-option"><input type="radio" name="answer" value="${esc(o)}" ${attempt?.answer === o ? "checked" : ""} ${attempt ? "disabled" : ""} required>${esc(o)}</label>`).join("")}<button class="primary" ${attempt ? "disabled" : ""}>Kirim jawaban LPDP</button></form><div id="lpdp-answer-result">${attempt ? `<div class="notice ${attempt.correct ? "success" : ""}"><strong>${attempt.correct ? "Benar" : "Belum tepat"} · Skor soal ${attempt.correct ? "1/1" : "0/1"}</strong><p>Jawaban benar: ${esc(attempt.correctAnswer)}</p><p>${esc(attempt.explanation)}</p><small>Waktu aktual: ${attempt.seconds} detik</small></div>${button(run.index + 1 === run.ids.length ? "Lihat hasil latihan" : "Soal berikutnya LPDP", "lpdp-next")}` : ""}</div><p class="muted">${esc(q.source)}</p></article>` : active ? empty("Soal sesi ini tidak tersedia. Akhiri sesi lalu mulai kembali.") : ""}${!active && run && summary ? `<div class="notice success" id="lpdp-summary"><h3>Hasil latihan · ${run.status === "expired" ? "Waktu habis" : run.status === "ended" ? "Diakhiri" : "Selesai"}</h3><strong>Skor ${summary.score}/100 · ${summary.correct}/${summary.total} benar</strong><p>${summary.answered} dijawab · ${summary.wrong} salah · ${summary.unanswered} belum dijawab. Skor latihan internal, bukan skor resmi LPDP.</p></div>` : ""}<details ${!active ? "open" : ""}><summary>Daftar soal (${selected.length})</summary><div class="question-list">${selected.map((q) => `<article class="note" data-lpdp-catalog-id="${esc(q.id)}">${badge(q.subcategory)} ${badge(q.difficulty)}<h3>${esc(q.prompt)}</h3><small>${esc(q.topic || "")} · estimasi ${q.estimatedSeconds || 90} detik</small>${button("Latih soal ini", `lpdp-single:${q.id}`)}</article>`).join("") || empty("Tidak ada soal sesuai filter.")}</div></details><details><summary>Riwayat jawaban LPDP (${attempts.length})</summary>${
    attempts
      .slice()
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .map(
        (a) =>
          `<article class="note"><strong>${esc(a.prompt || a.questionId)}</strong><p>${a.correct ? "Benar" : "Salah"} · ${esc(a.answer)} · ${a.seconds} detik</p><p>${esc(a.explanation || "")}</p><small>${esc(a.createdAt)} · ${esc(a.mode || "latihan")}</small></article>`,
      )
      .join("") || empty("Belum ada jawaban tersimpan.")
  }</details><details><summary>Riwayat hasil latihan (${results.length})</summary>${results.map((r) => `<p>${esc(r.date)} · ${esc(r.mode)} · ${r.correct}/${r.total} benar · Skor ${r.score}/100 · ${r.unanswered} belum dijawab</p>`).join("") || empty("Belum ada sesi selesai.")}</details></section>`;
}
