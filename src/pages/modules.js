export function modulePage(category, ctx) {
  const {
    data,
    filter,
    researchHTML,
    notesHTML,
    button,
    badge,
    empty,
    field,
    esc,
  } = ctx;
  const ts = data.topics.filter((t) => t.category === category);
  return `<div class="module-banner"><span class="eyebrow">LEARNING WORKSPACE</span><h1>${category}</h1><p>Pelajari, uji pemahaman, lalu ulangi. Penguasaan dan penyelesaian dicatat terpisah.</p>${badge("SAMPLE · Materi awal perlu verifikasi", "amber")}</div>${
    category === "English & TOEFL"
      ? `<section class="panel"><h2>Target TOEFL internal</h2><p>Baseline roadmap: 450–499. Target pribadi, bukan klaim persyaratan resmi.</p><form data-form="toefl">${field("Target", "target", data.settings.find((s) => s.id === "toefl")?.target || 550, "number")}<button>Simpan target</button></form><div class="panel-heading"><h3>Riwayat skor pribadi</h3>${button("+ Catat skor", "score-new")}</div>${
          data.settings
            .filter((s) => s.kind === "english-score")
            .map((s) => `<p>${esc(s.date)} · ${s.score} · ${esc(s.notes)}</p>`)
            .join("") || empty("Belum ada skor latihan tercatat.")
        }<label>Listening lokal<input type="file" id="audio-file" accept="audio/*"></label><audio id="local-audio" controls></audio><p class="muted">File diputar dari perangkat, tidak diunggah. Pilih kembali file setelah reload.</p></section>`
      : ""
  }<div class="topic-grid">${ts.map((t) => `<article class="panel"><div class="panel-heading">${badge(t.status)}<span class="muted">${t.mastery || 0}/5 recall</span></div><h2>${esc(t.title)}</h2><p>${esc(t.objective)}</p><p class="muted">${esc(t.summary)}</p>${button("Buka ruang materi ↗", `topic:${t.id}`)}</article>`).join("")}</div><section class="panel"><div class="panel-heading"><h2>${category === "LPDP" ? "Esai & latihan wawancara" : category === "Research" ? "Proyek riset & jurnal" : "Catatan belajar"}</h2>${button("+ Tambah", category === "Research" ? "research-new" : "note-new")}</div>${category === "Research" ? researchHTML() : notesHTML(category)}</section><div class="actions">${button("Latihan soal", "questions", "primary")}${button("Review flashcards", "cards")}${button("Mulai simulasi berbatas waktu", "start-study")}</div>`;
}
