export function errors(ctx) {
  const { data, button, badge, empty, esc } = ctx;
  return `<div class="toolbar">${button("+ Tambah error", "error-new", "primary")}${button("Review Kesalahan Hari Ini", "review-errors")}</div><div class="topic-grid">${data.errorLogs.map((e) => `<article class="panel">${badge(e.resolved ? "Sudah direview" : "Perlu review", e.resolved ? "" : "amber")}<h2>${esc(e.title)}</h2><p>${esc(e.cause)}</p><p>${esc(e.correction)}</p><small>Review: ${esc(e.review)}</small><div class="actions">${button("Edit", `error-edit:${e.id}`)}${button("Review", `error-review:${e.id}`)}${button("Hapus", `error-delete:${e.id}`, "text-button")}</div></article>`).join("") || empty("Belum ada error log. Jawaban salah akan membuat entri yang dapat Anda lengkapi.")}</div>`;
}
