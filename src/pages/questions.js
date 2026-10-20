export function questions(ctx) {
  const {
    data,
    filter,
    activeQuestion,
    quizDeadline,
    quizQueue,
    quizIndex,
    button,
    badge,
    empty,
    options,
    field,
    select,
    esc,
    categories,
  } = ctx;
  const qs = data.questions.filter(
    (q) => !filter || filter === "Semua" || q.category === filter,
  );
  const q =
    activeQuestion && data.questions.find((q) => q.id === activeQuestion);
  return `<div class="toolbar"><label>Kategori<select id="question-filter">${options(["Semua", ...categories], filter || "Semua")}</select></label>${button("+ Tambah soal", "question-new", "primary")}${button("Acak soal", "question-random")}${button("Mini-tryout (5 soal)", "tryout")}${button("Export soal JSON", "question-export")}<label class="file-button">Import soal<input id="question-import" type="file" accept="application/json"></label></div>${q ? `<section class="panel question-active">${badge(q.sample ? "SAMPLE · perlu verifikasi" : q.category)} ${badge(q.difficulty)}<span class="muted"> ${quizQueue.length ? `Soal ${quizIndex + 1}/${quizQueue.length} · ` : ""}Timer <span id="question-clock">0</span> detik ${quizDeadline ? '<b id="quiz-clock"></b>' : ""}</span><h2>${esc(q.prompt)}</h2><form data-form="answer" data-id="${q.id}">${q.type === "short" ? field("Jawaban", "answer") : q.options.map((o) => `<label class="answer-option"><input type="radio" name="answer" value="${esc(o)}" required>${esc(o)}</label>`).join("")}<button class="primary">Periksa jawaban</button></form><div id="answer-result"></div><p class="muted">Sumber: ${esc(q.source)}</p>${button(q.bookmarked ? "★ Ditandai" : "☆ Tandai soal", `bookmark:${q.id}`)}</section>` : ""}<div class="question-list">${qs.map((q) => `<article class="panel"><div class="panel-heading">${badge(q.sample ? "SAMPLE" : q.category)}<small>${esc(q.subcategory)} · ${esc(q.type)}</small></div><h3>${esc(q.prompt)}</h3><div class="actions">${button("Kerjakan", `question:${q.id}`)}${button("Edit", `question-edit:${q.id}`, "text-button")}${button("Hapus", `question-delete:${q.id}`, "text-button")}</div></article>`).join("")}</div><section class="panel"><h2>Riwayat percobaan</h2>${
    data.attempts.length
      ? data.attempts
          .slice()
          .reverse()
          .slice(0, 20)
          .map(
            (a) =>
              `<p>${esc(a.prompt || a.questionId)} · ${a.correct ? "Benar" : "Salah"} · ${a.seconds} detik · ${esc(a.answer)}</p>`,
          )
          .join("")
      : empty("Belum ada jawaban tersimpan.")
  }</section>`;
}
