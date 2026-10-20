export function planner(ctx) {
  const {
    planDate,
    tasksHTML,
    timerHTML,
    sessionsHTML,
    button,
    esc,
    today,
    schedule,
  } = ctx;
  return `<div class="week-strip">${schedule.map((d, i) => `<div class="${new Date().getDay() === i ? "selected" : ""}"><small>${["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"][i]}</small><strong>${esc(d[0])}</strong><span>${i === 0 ? "Istirahat" : "120 menit"}</span></div>`).join("")}</div><div class="two-col"><section class="panel"><h2>Checklist harian</h2><label>Tanggal<input id="plan-date" type="date" value="${planDate}"></label><div id="planner-tasks">${tasksHTML(planDate)}</div><div class="actions">${button("Buat dari jadwal", "generate")}${button("+ Tambah tugas", "task-new")}</div></section>${timerHTML()}</div><section class="panel"><h2>Riwayat sesi</h2>${sessionsHTML()}</section>`;
}
