export function roadmap(ctx) {
  const { data, filter, button, badge, options, select, esc, statuses } = ctx;
  return `<div class="notice">Roadmap pribadi · 20 Oktober 2026 – 19 Oktober 2027. Bukan kalender resmi seleksi UI atau LPDP. Seluruh target dapat diedit.</div><div class="toolbar"><label>Filter status<select id="roadmap-filter">${options(["Semua", ...statuses], filter || "Semua")}</select></label></div><div class="roadmap-grid">${data.roadmapMonths
    .filter((m) => !filter || filter === "Semua" || m.status === filter)
    .map(
      (m) =>
        `<article class="panel roadmap-card"><div class="panel-heading"><span class="month-number">${String(m.month).padStart(2, "0")}</span>${badge(m.status)}</div><small class="eyebrow">BULAN ${m.month}</small><h2>${esc(m.title)}</h2><p>${esc(m.material)}</p><small>${esc(m.start)} → ${esc(m.target)}</small><div class="meter"><i style="width:${m.checklist?.length ? (m.checklist.filter((c) => c.done).length / m.checklist.length) * 100 : m.status === "Selesai" ? 100 : 0}%"></i></div><p class="muted">${m.checklist?.filter((c) => c.done).length || 0}/${m.checklist?.length || 0} checklist · ${esc(m.priority)}</p>${button("Buka & edit ↗", `month:${m.id}`)}</article>`,
    )
    .join("")}</div>`;
}
