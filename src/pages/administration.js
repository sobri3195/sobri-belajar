export function administration(ctx) {
  const { data, button, badge, esc } = ctx;
  return `<div class="notice">Checklist pribadi. Verifikasi persyaratan terbaru langsung pada institusi terkait.</div><div class="topic-grid">${data.documents.map((d) => `<article class="panel"><h2>${esc(d.title)}</h2>${badge(d.status)}<p>Diperiksa: ${esc(d.checked || "—")}<br>Deadline: ${esc(d.deadline || "—")}</p><p>${esc(d.notes)}</p>${button("Perbarui dokumen", `document:${d.id}`)}</article>`).join("")}</div>`;
}
