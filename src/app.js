import * as lpdp from "./services/lpdp-practice.js";
import { dashboard } from "./pages/dashboard.js";
import { planner } from "./pages/planner.js";
import { roadmap } from "./pages/roadmap.js";
import { modulePage } from "./pages/modules.js";
import { administration } from "./pages/administration.js";
import { questions } from "./pages/questions.js";
import { cards } from "./pages/cards.js";
import { errors } from "./pages/errors.js";
import { progress } from "./pages/progress.js";
import { settings } from "./pages/settings.js";
import { all, get, put, remove, uid, transaction } from "./db/indexeddb.js";
import { seed, categories, schedule } from "./data/seed.js";
import * as timer from "./services/timer.js";
import {
  backup,
  validate,
  validateQuestion,
  restore,
  download,
} from "./services/backup.js";
const $ = (s) => document.querySelector(s);
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const today = () => new Date().toLocaleDateString("en-CA");
const statuses = [
  "Belum dipelajari",
  "Sedang dipelajari",
  "Perlu pengulangan",
  "Selesai",
  "Ditunda",
];
const links = [
  ["dashboard", "◫", "Dashboard"],
  ["planner", "▦", "Planner Harian"],
  ["roadmap", "⌁", "Roadmap 12 Bulan"],
  ["SIMAK UI", "∑", "SIMAK UI"],
  ["BTKV", "♡", "BTKV"],
  ["LPDP", "◇", "LPDP"],
  ["English & TOEFL", "Aa", "English & TOEFL"],
  ["Research", "⌕", "Research & Publication"],
  ["Administration", "▤", "Administrasi"],
  ["questions", "?", "Bank Soal"],
  ["cards", "▣", "Flashcards"],
  ["errors", "↺", "Error Log"],
  ["progress", "▥", "Progres & Evaluasi"],
  ["notes", "✎", "Catatan"],
  ["settings", "⚙", "Data & Pengaturan"],
];
let lpdpFilter = "Semua",
  lpdpDifficulty = "Semua",
  lpdpExpiryBusy = false;
let planDate = today();
let quizDeadline = 0,
  quizRunId = null;
let data = {},
  route = "dashboard",
  activeQuestion = null,
  questionStart = 0,
  filter = "",
  pendingBackup = null,
  quizQueue = [],
  quizIndex = 0,
  audioURL = null;
const options = (xs, v) =>
  xs
    .map((x) => `<option ${x === v ? "selected" : ""}>${esc(x)}</option>`)
    .join("");
const button = (text, action, cls = "") =>
  `<button type="button" class="${cls}" data-action="${action}">${text}</button>`;
const empty = (text) => `<div class="empty">${text}</div>`;
const badge = (text, cls = "") =>
  `<span class="badge ${cls}">${esc(text)}</span>`;
const field = (label, name, value = "", type = "text") =>
  `<label>${label}<input aria-label="${esc(label)}" name="${name}" type="${type}" value="${esc(value)}"></label>`;
const area = (label, name, value = "") =>
  `<label>${label}<textarea aria-label="${esc(label)}" name="${name}" rows="3">${esc(value)}</textarea></label>`;
const select = (label, name, xs, v) =>
  `<label>${label}<select aria-label="${esc(label)}" name="${name}">${options(xs, v)}</select></label>`;
function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 4000);
}
function go(path) {
  location.hash = encodeURIComponent(path);
}
async function load() {
  for (const s of [
    "settings",
    "roadmapMonths",
    "topics",
    "studyTasks",
    "studySessions",
    "questions",
    "attempts",
    "flashcards",
    "errorLogs",
    "notes",
    "weeklyReviews",
    "monthlyReviews",
    "researchProjects",
    "documents",
  ])
    data[s] = await all(s);
  data.roadmapMonths.sort((a, b) => a.month - b.month);
}
const mins = (seconds) => Math.round(seconds / 60);
function stats() {
  const sessions = data.studySessions;
  const now = today();
  const daily = sessions.filter((s) => s.date === now);
  const attempts = data.attempts;
  return {
    minutes: mins(daily.reduce((a, s) => a + Number(s.seconds || 0), 0)),
    sessions: daily.filter((s) => s.status === "completed").length,
    accuracy: attempts.length
      ? Math.round(
          (attempts.filter((a) => a.correct).length / attempts.length) * 100,
        )
      : null,
    roadmap: Math.round(
      (data.roadmapMonths.filter((m) => m.status === "Selesai").length / 12) *
        100,
    ),
    days: new Set(sessions.filter((s) => s.seconds > 0).map((s) => s.date))
      .size,
  };
}
function streak() {
  let count = 0;
  const dates = new Set(
    data.studySessions.filter((s) => s.seconds > 0).map((s) => s.date),
  );
  const d = new Date();
  if (!dates.has(today())) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 3700; i++) {
    const key = d.toLocaleDateString("en-CA");
    if (dates.has(key)) count++;
    else if (!isRest(d)) break;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
function isRest(d) {
  const custom = data.settings.find((s) => s.id === "schedule");
  return custom?.days?.[d.getDay()]?.rest ?? d.getDay() === 0;
}
function monthNow() {
  return data.roadmapMonths.find(
    (m) => today() >= m.start && today() <= m.target,
  );
}
function chart(days = 7) {
  let bars = "";
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toLocaleDateString("en-CA");
    const minutes = mins(
      data.studySessions
        .filter((s) => s.date === key)
        .reduce((a, s) => a + Number(s.seconds || 0), 0),
    );
    bars += `<div class="bar-wrap" title="${key}: ${minutes} menit"><span>${minutes || ""}</span><div class="bar" style="height:${Math.min(100, (minutes / 120) * 100)}%"></div><small>${days === 7 ? date.toLocaleDateString("id-ID", { weekday: "short" }) : date.getDate()}</small></div>`;
  }
  return `<div class="chart">${bars}</div>`;
}
function tasksHTML(date = today()) {
  const tasks = data.studyTasks.filter((t) => t.date === date);
  return tasks.length
    ? tasks
        .map(
          (t) =>
            `<div class="task"><input aria-label="Selesaikan ${esc(t.title)}" type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""}><div><strong class="${t.done ? "done" : ""}">${esc(t.title)}</strong><small>${esc(t.category)} · ${t.minutes} menit</small></div>${button("✎", `task-edit:${t.id}`, "icon-button")}${button("→", `task-delay:${t.id}`, "icon-button")}${button("×", `task-delete:${t.id}`, "icon-button")}</div>`,
        )
        .join("")
    : empty("Belum ada tugas. Buat jadwal hari ini atau tambah tugas sendiri.");
}
function timerHTML() {
  return `<section class="panel timer-panel"><span class="eyebrow">FOCUS SESSION</span><h2>Ruang fokus Anda</h2><div class="timer-ring" id="timer-ring"><strong id="clock">50:00</strong><small id="timer-status">Siap memulai</small></div><label>Durasi<select id="timer-duration"><option value="10">10 menit · Recall</option><option value="50" selected>50 menit · Materi utama</option><option value="45">45 menit · Latihan</option><option value="15">15 menit · Evaluasi</option></select></label><label>Kategori<select id="timer-category">${options(categories)}</select></label><label>Catatan sesi<input id="timer-note" placeholder="Apa yang ingin Anda pelajari?"></label><div class="actions">${button("▶ Mulai", "timer-start", "primary")}${button("Pause", "timer-pause")}${button("Resume", "timer-resume")}${button("Selesai", "timer-finish")}${button("Reset", "timer-reset", "text-button")}</div><small id="recovery" class="muted"></small></section>`;
}
function sessionsHTML() {
  return data.studySessions.length
    ? `<div class="table-scroll"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Aktual</th><th>Status</th><th>Catatan</th></tr></thead><tbody>${data.studySessions
        .slice()
        .reverse()
        .map(
          (s) =>
            `<tr><td>${esc(s.date)}</td><td>${esc(s.category)}</td><td>${Number(s.seconds).toFixed(0)} detik</td><td>${esc(s.status)}</td><td>${esc(s.note)}</td></tr>`,
        )
        .join("")}</tbody></table></div>`
    : empty("Belum ada sesi tersimpan.");
}
function researchHTML() {
  return data.researchProjects.length
    ? data.researchProjects
        .map(
          (p) =>
            `<div class="list-row"><div><strong>${esc(p.title)}</strong><small>${esc(p.status)} · Deadline ${esc(p.deadline || "belum diatur")} · ${esc(p.pico)}</small></div>${button("Edit", `research-edit:${p.id}`)}</div>`,
        )
        .join("")
    : empty(
        "Buat proyek untuk mencatat PICO, PRISMA, referensi, deadline dan status publikasi.",
      );
}
function notesHTML(category) {
  const ns = data.notes.filter((n) => !category || n.category === category);
  return ns.length
    ? ns
        .map(
          (n) =>
            `<article class="note"><div class="panel-heading"><h3>${esc(n.title)}</h3>${button("Edit / revisi", `note-edit:${n.id}`)}</div><small>${esc(n.category)} · ${esc(n.updatedAt)} · ${(n.revisions || []).length} revisi</small><p class="preserve">${esc(n.body)}</p>${n.revisions?.length ? `<details><summary>Riwayat revisi</summary>${n.revisions.map((r) => `<p><small>${esc(r.date)}</small><br>${esc(r.body)}</p>`).join("")}</details>` : ""}</article>`,
        )
        .join("")
    : empty(
        "Belum ada catatan. Tuliskan pemahaman Anda dengan kata-kata sendiri.",
      );
}
const causes = [
  "Tidak memahami konsep",
  "Lupa",
  "Salah membaca",
  "Kesalahan perhitungan",
  "Kehabisan waktu",
  "Menebak",
  "Salah menerapkan konsep",
];
let renderRevision = 0;
async function render() {
  const revision = ++renderRevision;
  const requestedRoute = decodeURIComponent(
    location.hash.slice(1) || "dashboard",
  );
  await load();
  if (revision !== renderRevision) return;
  const savedQuiz = data.settings.find((x) => x.id === "activeQuiz");
  if (savedQuiz?.status === "running") {
    quizQueue = savedQuiz.ids;
    quizIndex = savedQuiz.index;
    quizDeadline = savedQuiz.deadline;
    quizRunId = savedQuiz.runId;
    activeQuestion = quizQueue[quizIndex];
    questionStart = savedQuiz.questionStart;
  }
  route = requestedRoute;
  const title = links.find((l) => l[0] === route)?.[2] || "Dashboard";
  const viewContext = {
    lpdpFilter,
    lpdpDifficulty,
    planDate,
    mins,
    data,
    route,
    filter,
    activeQuestion,
    quizDeadline,
    quizQueue,
    quizIndex,
    stats,
    monthNow,
    streak,
    isRest,
    chart,
    tasksHTML,
    timerHTML,
    sessionsHTML,
    researchHTML,
    notesHTML,
    button,
    badge,
    empty,
    options,
    field,
    area,
    select,
    esc,
    today,
    schedule,
    categories,
    statuses,
  };
  const content =
    route === "dashboard"
      ? dashboard(viewContext)
      : route === "planner"
        ? planner(viewContext)
        : route === "roadmap"
          ? roadmap(viewContext)
          : route === "Administration"
            ? administration(viewContext)
            : categories.includes(route)
              ? modulePage(route, viewContext)
              : route === "questions"
                ? questions(viewContext)
                : route === "cards"
                  ? cards(viewContext)
                  : route === "errors"
                    ? errors(viewContext)
                    : route === "progress"
                      ? progress(viewContext)
                      : route === "notes"
                        ? `<div class="toolbar">${button("+ Tambah catatan", "note-new", "primary")}</div><section class="panel">${notesHTML()}</section>`
                        : settings(viewContext);
  $("#app").innerHTML =
    `<aside class="sidebar"><button class="drawer-close" data-action="menu" aria-label="Tutup navigasi">×</button><a class="brand" href="#dashboard"><span class="brand-mark">S<span>↗</span></span><div>SOBRI'S<small>STUDY ROADMAP</small></div></a><div class="nav-label">RUANG BELAJAR</div><nav>${links.map(([id, icon, label], i) => `${i === 3 ? '<div class="nav-label">FOKUS PEMBELAJARAN</div>' : i === 9 ? '<div class="nav-label">LEARNING TOOLS</div>' : ""}<a class="${id === route ? "active" : ""}" href="#${encodeURIComponent(id)}"><span>${icon}</span>${label}${id === route ? "<i></i>" : ""}</a>`).join("")}</nav><div class="sidebar-bottom"><span class="avatar">S</span><div>Sobri<small>Calon Spesialis BTKV</small></div><span>✦</span></div></aside><button class="drawer-backdrop" data-action="menu" aria-label="Tutup menu"></button><div class="workspace"><header><button class="menu-toggle" data-action="menu" aria-label="Buka navigasi">☰</button><div class="breadcrumb">Workspace <span>/</span> <strong>${title}</strong></div><div class="header-right"><span class="header-date">${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span><span id="connection" class="connection"></span><span class="avatar">S</span></div></header><main><div class="page-heading"><div><span class="eyebrow">PPDS BTKV · UNIVERSITAS INDONESIA + LPDP 2028</span><h1>${route === "dashboard" ? "Selamat datang kembali, Sobri 👋" : title}</h1><p>${route === "dashboard" ? "Satu langkah lebih dekat menuju mimpi Anda. Mari jaga ritmenya." : "Ruang pribadi untuk belajar dengan terarah dan konsisten."}</p></div>${route === "dashboard" ? button("▦ Planner hari ini", "planner") : ""}</div>${content}<footer>✦ SOBRI'S STUDY ROADMAP <span>Disimpan lokal. Dibangun untuk perjalanan panjang.</span></footer></main></div>`;
  connection();
  document.documentElement.dataset.theme =
    localStorage.getItem("theme") || "Terang";
  await updateTimer();
  if (revision !== renderRevision) return;
  if (route === "planner") {
    const active = await timer.current();
    if (revision !== renderRevision) return;
    if (active && ["running", "paused"].includes(active.status)) {
      $("#timer-note").value = active.note || "";
      $("#timer-category").value = active.category;
      $("#timer-duration").value = String(active.planned);
    }
  }
  if (route === "questions" && quizRunId && activeQuestion) {
    const attempt = data.attempts.find(
      (a) => a.runId === quizRunId && a.questionId === activeQuestion,
    );
    if (attempt) {
      const form = $("[data-form=answer]");
      if (form) {
        form.dataset.answered = "true";
        form.querySelector("button").disabled = true;
        $("#answer-result").innerHTML =
          "<p>Jawaban sebelumnya sudah tersimpan.</p>" +
          button("Soal berikutnya →", "quiz-next");
      }
    }
  }
  if (route === "settings") cacheStatus();
}
function connection() {
  const e = $("#connection");
  if (e)
    e.innerHTML = `<i class="${navigator.onLine ? "" : "offline"}"></i> ${navigator.onLine ? "Lokal · Online" : "Mode offline"}`;
}
async function dialog(title, body, onSubmit, { draftKey } = {}) {
  const d = document.createElement("dialog");
  d.innerHTML = `<form method="dialog"><div class="panel-heading"><h2>${esc(title)}</h2><button type="button" data-close aria-label="Tutup">×</button></div>${body}<div class="dialog-actions"><button type="button" data-close>${draftKey ? "Tutup · simpan draft" : "Batal"}</button><button class="primary" type="submit">Simpan</button></div></form>`;
  document.body.append(d);
  d.querySelectorAll("[data-close]").forEach(
    (b) => (b.onclick = () => d.close()),
  );
  let saved = false,
    dirty = false,
    pending;
  const form = d.querySelector("form");
  const saveDraft = () =>
    put("settings", {
      id: draftKey,
      kind: "form-draft",
      values: Object.fromEntries(new FormData(form)),
    });
  if (draftKey) {
    try {
      const draft = await get("settings", draftKey);
      if (draft?.values) {
        for (const [name, value] of Object.entries(draft.values)) {
          const input = form.elements.namedItem(name);
          if (input && typeof value === "string") input.value = value;
        }
        form.insertAdjacentHTML(
          "afterbegin",
          '<p class="muted">Draft lokal dipulihkan.</p>',
        );
      }
    } catch (e) {
      toast(e.message);
    }
    form.addEventListener("input", () => {
      dirty = true;
      clearTimeout(pending);
      pending = setTimeout(
        () => saveDraft().catch((e) => toast(e.message)),
        350,
      );
    });
  }
  d.addEventListener("close", () => {
    clearTimeout(pending);
    if (draftKey && dirty && !saved) saveDraft().catch((e) => toast(e.message));
    d.remove();
  });
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      clearTimeout(pending);
      await onSubmit(Object.fromEntries(new FormData(e.target)), e.target);
      saved = true;
      if (draftKey) await remove("settings", draftKey);
      d.close();
      await render();
      toast("Tersimpan di perangkat.");
    } catch (err) {
      toast(err.message);
    }
  };
  d.showModal();
}
async function generate() {
  const date = $("#plan-date")?.value || today();
  const d = new Date(date + "T12:00:00");
  const custom = data.settings.find((s) => s.id === "schedule")?.days?.[
    d.getDay()
  ];
  if (custom?.rest ?? d.getDay() === 0) {
    toast("Hari istirahat. Anda boleh menambah review opsional.");
    return;
  }
  const base = schedule[d.getDay()];
  const acts = custom?.activities || base.slice(1);
  for (let i = 0; i < acts.length; i++) {
    const id = `daily-${date}-${i}`;
    if (!(await get("studyTasks", id)))
      await put("studyTasks", {
        id,
        date,
        title: acts[i],
        category: custom?.category || base[0],
        minutes: [10, 50, 45, 15][i] || 15,
        done: false,
      });
  }
  await render();
  toast("Jadwal disiapkan tanpa menduplikasi tugas.");
}
function editTask(t = {}) {
  dialog(
    t.id ? "Edit tugas" : "Tambah tugas",
    field("Judul", "title", t.title) +
      field(
        "Tanggal",
        "date",
        t.date || $("#plan-date")?.value || today(),
        "date",
      ) +
      select("Kategori", "category", categories, t.category) +
      field("Menit", "minutes", t.minutes || 15, "number"),
    async (f) => {
      if (!f.title.trim() || !f.date || Number(f.minutes) <= 0)
        throw Error("Isi judul, tanggal dan durasi positif.");
      await put("studyTasks", {
        ...t,
        ...f,
        minutes: Number(f.minutes),
        done: t.done || false,
      });
    },
  );
}
function editMonth(m) {
  dialog(
    "Bulan " + m.month + " · Roadmap",
    field("Judul", "title", m.title) +
      field("Tanggal mulai", "start", m.start, "date") +
      field("Tanggal target", "target", m.target, "date") +
      area("Materi", "material", m.material) +
      select("Status", "status", statuses, m.status) +
      select(
        "Prioritas",
        "priority",
        ["Rendah", "Normal", "Tinggi"],
        m.priority,
      ) +
      area(
        "Checklist: [x] selesai, [ ] belum (satu per baris)",
        "checklistText",
        (m.checklist || [])
          .map((c) => `[${c.done ? "x" : " "}] ${c.title}`)
          .join("\n"),
      ) +
      area("Catatan", "notes", m.notes) +
      field("Referensi", "reference", m.reference) +
      field("Jadwal review", "review", m.review, "date"),
    async (f) => {
      if (!f.title || !f.start || !f.target || f.target < f.start)
        throw Error("Periksa judul dan rentang tanggal.");
      const checklist = f.checklistText
        .split("\n")
        .filter((x) => x.trim())
        .map((x) => ({
          title: x.replace(/^\[[ xX]\]\s*/, ""),
          done: /^\[[xX]\]/.test(x),
        }));
      delete f.checklistText;
      await put("roadmapMonths", { ...m, ...f, checklist });
    },
  );
}
function editTopic(t) {
  dialog(
    t.title,
    badge("SAMPLE · verifikasi materi awal") +
      `<div class="actions">${button("+ Flashcard topik", `topic-card:${t.id}`)}${button("+ Soal topik", `topic-question:${t.id}`)}</div>` +
      area("Tujuan pembelajaran", "objective", t.objective) +
      area("Ringkasan", "summary", t.summary) +
      field("Sumber referensi", "reference", t.reference) +
      area("Catatan pribadi", "notes", t.notes) +
      select("Status", "status", statuses, t.status) +
      select(
        "Hasil recall pribadi (0–5)",
        "mastery",
        ["0", "1", "2", "3", "4", "5"],
        String(t.mastery || 0),
      ) +
      field("Review berikutnya", "review", t.review, "date"),
    async (f) => put("topics", { ...t, ...f, mastery: Number(f.mastery) }),
  );
}
function editNote(n = {}) {
  dialog(
    n.id ? "Revisi catatan" : "Catatan / esai baru",
    field("Judul", "title", n.title) +
      select(
        "Kategori",
        "category",
        categories,
        n.category || (categories.includes(route) ? route : "BTKV"),
      ) +
      area("Isi catatan / draft esai / evaluasi wawancara", "body", n.body),
    async (f) => {
      if (!f.title.trim()) throw Error("Judul diperlukan");
      await put("notes", {
        ...n,
        ...f,
        revisions: n.id
          ? [
              ...(n.revisions || []),
              { date: new Date().toISOString(), body: n.body },
            ]
          : [],
      });
    },
    { draftKey: "draft-note-" + (n.id || route) },
  );
}
function editQuestion(q = {}) {
  dialog(
    q.id ? "Edit soal" : "Tambah soal",
    field("Pertanyaan", "prompt", q.prompt) +
      select("Kategori", "category", categories, q.category) +
      field("Subkategori", "subcategory", q.subcategory) +
      select("Jenis", "type", ["mcq", "boolean", "short"], q.type) +
      select(
        "Kesulitan",
        "difficulty",
        ["Mudah", "Sedang", "Sulit"],
        q.difficulty,
      ) +
      area(
        "Pilihan (satu per baris; true/false: Benar dan Salah)",
        "choices",
        (q.options || []).join("\n"),
      ) +
      field("Jawaban benar", "answer", q.answer) +
      area("Pembahasan", "explanation", q.explanation) +
      field("Sumber", "source", q.source),
    async (f) => {
      const choices = f.choices
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      if (
        !f.prompt.trim() ||
        !f.answer.trim() ||
        (f.type !== "short" &&
          (choices.length < 2 || !choices.includes(f.answer)))
      )
        throw Error("Isi soal, jawaban dan pilihan yang memuat jawaban benar.");
      delete f.choices;
      await put("questions", {
        ...q,
        ...f,
        options: choices,
        sample: q.sample || false,
      });
    },
  );
}
function editError(e = {}) {
  dialog(
    "Error log",
    field("Materi / kesalahan", "title", e.title) +
      select("Penyebab", "cause", causes, e.cause) +
      area("Catatan koreksi", "correction", e.correction) +
      field("Review berikutnya", "review", e.review || today(), "date"),
    async (f) => {
      if (!f.title.trim()) throw Error("Judul diperlukan");
      await put("errorLogs", { ...e, ...f, resolved: false });
    },
  );
}
function editCard(c = {}) {
  dialog(
    "Flashcard",
    select("Kategori", "category", categories, c.category) +
      area("Depan", "front", c.front) +
      area("Belakang", "back", c.back) +
      field("Review berikutnya", "review", c.review || today(), "date"),
    async (f) => {
      if (!f.front || !f.back) throw Error("Isi kedua sisi kartu");
      await put("flashcards", {
        ...c,
        ...f,
        interval: c.interval || 0,
        reviews: c.reviews || [],
      });
    },
  );
}
async function updateTimer() {
  const clock = $("#clock");
  if (!clock) return;
  const s = await timer.current();
  if (!s || !["running", "paused"].includes(s.status)) {
    clock.textContent =
      String($("#timer-duration")?.value || 50).padStart(2, "0") + ":00";
    return;
  }
  const elapsed = timer.elapsed(s),
    remaining = Math.max(0, Math.ceil(s.planned * 60 - elapsed));
  clock.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  $("#timer-status").textContent =
    remaining === 0
      ? "Waktu habis · konfirmasi selesai"
      : s.status === "paused"
        ? "Dijeda"
        : "Sedang fokus";
  $("#timer-ring").style.setProperty(
    "--progress",
    `${(elapsed / (s.planned * 60)) * 360}deg`,
  );
  $("#recovery").textContent =
    "Sesi tersimpan otomatis. Waktu dihitung dari timestamp; jika meninggalkan browser, konfirmasi durasi aktual saat mengakhiri.";
}
async function endTimer(completed) {
  const s = await timer.current();
  if (!s || !["running", "paused"].includes(s.status)) {
    toast("Tidak ada sesi aktif.");
    return;
  }
  await timer.pause();
  const actual = timer.elapsed(await timer.current());
  dialog(
    completed ? "Konfirmasi sesi selesai" : "Akhiri / reset sesi",
    `<p>Waktu terukur ${Math.floor(actual)} detik. Koreksi jika Anda meninggalkan perangkat. Durasi rencana tidak otomatis dihitung penuh.</p>${field("Durasi aktual (detik)", "actual", Math.floor(actual), "number")}${area("Catatan", "note", s.note)}`,
    async (f) => {
      const seconds = Number(f.actual);
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > actual + 1)
        throw Error("Durasi harus antara 0 dan waktu terukur.");
      await put("settings", {
        ...(await timer.current()),
        accumulated: seconds,
        note: f.note,
        status: "paused",
      });
      await timer.finish(completed);
    },
  );
}
async function cacheStatus() {
  const el = $("#cache-status");
  if (!el) return;
  const keys = await caches.keys();
  const reg = await navigator.serviceWorker?.getRegistration();
  el.textContent =
    reg?.active && keys.some((k) => k.startsWith("sobri-shell"))
      ? "App shell tersimpan. Siap diuji offline."
      : "Cache belum siap. Gunakan build produksi melalui HTTPS atau localhost.";
}
async function action(a) {
  const [key, id, value] = a.split(":");
  if (key.startsWith("lpdp-")) {
    const active = await lpdp.currentLpdpRun();
    if (key.startsWith("lpdp-start-") || key === "lpdp-single") {
      const mode =
        key === "lpdp-start-timed"
          ? "timed"
          : key === "lpdp-start-review"
            ? "review"
            : "practice";
      const allQuestions = data.questions.filter((q) => q.category === "LPDP");
      const matching = allQuestions.filter(
        (q) =>
          (lpdpFilter === "Semua" || q.subcategory === lpdpFilter) &&
          (lpdpDifficulty === "Semua" || q.difficulty === lpdpDifficulty),
      );
      const selected =
        key === "lpdp-single"
          ? allQuestions.filter((q) => q.id === id)
          : mode === "review"
            ? lpdp.latestWrongQuestions(matching, data.attempts)
            : matching;
      if (!selected.length) {
        toast(
          mode === "review"
            ? "Tidak ada jawaban salah pada filter ini."
            : "Tidak ada soal sesuai filter.",
        );
        return;
      }
      if (active?.status === "running") {
        if (
          !confirm(
            "Akhiri latihan aktif dan mulai latihan baru? Jawaban lama tetap disimpan.",
          )
        )
          return;
        await lpdp.finishLpdpRun("ended");
      }
      await lpdp.startLpdpRun(
        selected.map((q) => q.id),
        mode,
      );
    } else if (key === "lpdp-next") await lpdp.nextLpdpQuestion();
    else if (key === "lpdp-finish") {
      if (!confirm("Akhiri latihan? Jawaban yang belum dikirim tidak dinilai."))
        return;
      await lpdp.finishLpdpRun("ended");
    }
    await render();
    $("#lpdp-practice")?.scrollIntoView({ block: "start" });
    return;
  }

  if (
    [
      "dashboard",
      "planner",
      "roadmap",
      "questions",
      "cards",
      "errors",
      "progress",
      "settings",
    ].includes(a)
  ) {
    filter = "";
    go(a);
    return;
  }
  if (key === "menu") {
    $(".sidebar").classList.toggle("open");
    return;
  }
  if (key === "generate") return generate();
  if (key === "start-study" || key === "timer") {
    const previous = route;
    go("planner");
    await render();
    if (categories.includes(previous)) $("#timer-category").value = previous;
    $(".timer-panel")?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (key === "task-new") return editTask();
  if (key === "task-edit")
    return editTask(data.studyTasks.find((t) => t.id === id));
  if (key === "task-delay") {
    const t = data.studyTasks.find((t) => t.id === id);
    const d = new Date(t.date + "T12:00:00");
    d.setDate(d.getDate() + 1);
    await put("studyTasks", { ...t, date: d.toLocaleDateString("en-CA") });
  }
  if (key === "task-delete" && confirm("Hapus tugas ini?"))
    await remove("studyTasks", id);
  if (key === "month")
    return editMonth(data.roadmapMonths.find((m) => m.id === id));
  if (key === "topic-card" || key === "topic-question") {
    const t = data.topics.find((t) => t.id === id);
    document.querySelector("dialog")?.close();
    if (key === "topic-card")
      return editCard({
        category: t.category,
        front: t.title + "?",
        topicId: t.id,
      });
    return editQuestion({
      category: t.category,
      subcategory: t.title,
      topicId: t.id,
    });
  }
  if (key === "topic") return editTopic(data.topics.find((t) => t.id === id));
  if (key === "note-new") return editNote();
  if (key === "note-edit") return editNote(data.notes.find((n) => n.id === id));
  if (key === "timer-start") {
    const s = await timer.current();
    if (s && ["running", "paused"].includes(s.status)) {
      toast("Sesi masih aktif. Lanjutkan atau akhiri terlebih dahulu.");
      return;
    }
    await timer.begin(
      Number($("#timer-duration").value),
      $("#timer-category").value,
      $("#timer-note").value,
    );
  }
  if (key === "timer-pause") await timer.pause();
  if (key === "timer-resume") await timer.resume();
  if (key === "timer-finish") return endTimer(true);
  if (key === "timer-reset") return endTimer(false);
  if (key === "question-new") return editQuestion();
  if (key === "question-edit")
    return editQuestion(data.questions.find((q) => q.id === id));
  if (
    key === "question-delete" &&
    confirm("Hapus soal? Riwayat jawaban tetap disimpan.")
  )
    await remove("questions", id);
  if (key === "question") {
    activeQuestion = id;
    questionStart = Date.now();
  }
  if (key === "bookmark") {
    const q = data.questions.find((q) => q.id === id);
    await put("questions", { ...q, bookmarked: !q.bookmarked });
  }
  if (key === "question-random" || key === "tryout") {
    if (quizDeadline) {
      toast("Selesaikan tryout aktif terlebih dahulu.");
      return;
    }
    const qs = data.questions
      .filter((q) => !filter || filter === "Semua" || q.category === filter)
      .sort(() => Math.random() - 0.5);
    if (!qs.length) {
      toast("Belum ada soal.");
      return;
    }
    if (key === "tryout")
      return dialog(
        "Mini-tryout lokal",
        `<p>Maksimal 5 soal dari kategori terpilih. Soal SAMPLE bukan soal resmi. Waktu habis akan mengakhiri percobaan; jawaban yang belum dikirim tidak dihitung.</p>${field("Batas waktu (menit)", "minutes", 10, "number")}`,
        async (f) => {
          const minutes = Number(f.minutes);
          if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240)
            throw Error("Durasi 1–240 menit");
          quizQueue = qs.slice(0, 5).map((q) => q.id);
          quizIndex = 0;
          quizDeadline = Date.now() + minutes * 60000;
          quizRunId = uid();
          activeQuestion = quizQueue[0];
          questionStart = Date.now();
          await saveQuiz();
        },
      );
    quizQueue = [];
    quizIndex = 0;
    activeQuestion = qs[0].id;
    questionStart = Date.now();
  }
  if (key === "quiz-next") {
    quizIndex++;
    if (quizIndex < quizQueue.length) {
      activeQuestion = quizQueue[quizIndex];
      questionStart = Date.now();
      if (quizDeadline) await saveQuiz();
    } else {
      await finishQuiz();
      toast("Mini-tryout selesai. Hasil tercatat pada progres.");
    }
  }
  if (key === "question-export") {
    download(
      { app: "sobri-questions", version: 1, questions: data.questions },
      "sobri-questions.json",
    );
    return;
  }
  if (key === "error-new") return editError();
  if (key === "error-edit")
    return editError(data.errorLogs.find((e) => e.id === id));
  if (key === "error-delete" && confirm("Hapus error log?"))
    await remove("errorLogs", id);
  if (key === "error-review") {
    const e = data.errorLogs.find((e) => e.id === id);
    return dialog(
      "Review · " + e.title,
      `<p>${esc(e.correction)}</p>${area("Hasil recall / koreksi baru", "correction", e.correction)}${field("Review berikutnya", "review", new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-CA"), "date")}`,
      async (f) =>
        put("errorLogs", {
          ...e,
          ...f,
          resolved: true,
          reviewedAt: new Date().toISOString(),
        }),
    );
  }
  if (key === "review-errors") {
    const due = data.errorLogs.filter((e) => e.review <= today());
    const ids = [
      ...new Set(
        due
          .map((e) => e.questionId)
          .filter((id) => data.questions.some((q) => q.id === id)),
      ),
    ];
    const topics = data.topics.filter((t) => t.review && t.review <= today());
    if (ids.length) {
      quizQueue = ids;
      quizIndex = 0;
      activeQuestion = ids[0];
      questionStart = Date.now();
      go("questions");
      return;
    }
    if (due.length) return action("error-review:" + due[0].id);
    if (topics.length) return editTopic(topics[0]);
    toast("Tidak ada soal, error, atau materi jatuh tempo.");
    go("errors");
    return;
  }
  if (key === "card-new") return editCard();
  if (key === "card-edit")
    return editCard(data.flashcards.find((c) => c.id === id));
  if (key === "card-delete" && confirm("Hapus flashcard?"))
    await remove("flashcards", id);
  if (key === "card-rate") {
    const c = data.flashcards.find((c) => c.id === id);
    const interval =
      value === "0"
        ? 1
        : value === "1"
          ? Math.max(1, Math.round((c.interval || 1) * 1.2))
          : Math.max(3, (c.interval || 1) * 2);
    await put("flashcards", {
      ...c,
      interval,
      review: new Date(Date.now() + interval * 86400000).toLocaleDateString(
        "en-CA",
      ),
      reviews: [...(c.reviews || []), { date: today(), rating: Number(value) }],
    });
    toast("Review tersimpan.");
  }
  if (key === "document") {
    const d = data.documents.find((d) => d.id === id);
    return dialog(
      d.title,
      select(
        "Status",
        "status",
        ["Belum diperiksa", "Perlu dilengkapi", "Lengkap", "Kedaluwarsa"],
        d.status,
      ) +
        field("Tanggal pemeriksaan", "checked", d.checked || today(), "date") +
        field("Deadline", "deadline", d.deadline, "date") +
        area("Catatan", "notes", d.notes) +
        field("Tautan referensi", "reference", d.reference),
      async (f) => put("documents", { ...d, ...f }),
    );
  }
  if (key === "score-new")
    return dialog(
      "Catat skor TOEFL latihan",
      field("Tanggal", "date", today(), "date") +
        field("Skor internal", "score", 450, "number") +
        area("Sumber tes & evaluasi", "notes"),
      async (f) => {
        const score = Number(f.score);
        if (!Number.isFinite(score) || score < 0 || !f.date)
          throw Error("Tanggal dan skor tidak valid");
        await put("settings", {
          id: "english-score-" + uid(),
          kind: "english-score",
          ...f,
          score,
        });
      },
    );
  if (key === "research-new" || key === "research-edit") {
    const p = data.researchProjects.find((p) => p.id === id) || {};
    return dialog(
      "Proyek riset",
      field("Judul", "title", p.title) +
        area("PICO", "pico", p.pico) +
        area("Literature review & catatan jurnal", "literature", p.literature) +
        area("Critical appraisal & statistik", "appraisal", p.appraisal) +
        area("PRISMA checklist", "prisma", p.prisma) +
        field("Referensi", "references", p.references) +
        field("Deadline manuskrip", "deadline", p.deadline, "date") +
        select(
          "Status publikasi",
          "status",
          [
            "Ide",
            "Protokol",
            "Pengumpulan data",
            "Analisis",
            "Manuskrip",
            "Submitted",
            "Published",
          ],
          p.status,
        ),
      async (f) => {
        if (!f.title) throw Error("Judul diperlukan");
        await put("researchProjects", { ...p, ...f });
      },
    );
  }
  if (key === "review-new")
    return dialog(
      "Evaluasi berkala",
      select("Periode", "period", ["Mingguan", "Bulanan"]) +
        field("Tanggal", "date", today(), "date") +
        area("Pencapaian, kendala, evaluasi & rencana berikutnya", "body"),
      async (f) => {
        if (!f.body) throw Error("Isi evaluasi");
        await put(
          f.period === "Mingguan" ? "weeklyReviews" : "monthlyReviews",
          f,
        );
      },
    );
  if (key === "backup-export") {
    download(await backup(), "sobri-backup-" + today() + ".json");
    toast("Backup diekspor.");
    return;
  }
  if (key === "backup-merge" || key === "backup-replace") {
    if (!pendingBackup) return;
    if (
      !confirm(
        key === "backup-replace"
          ? "Ganti SELURUH data lokal dengan backup? Backup data sekarang sebelum melanjutkan."
          : "Gabungkan backup? ID sama akan ditimpa.",
      )
    )
      return;
    await restore(pendingBackup, key === "backup-replace");
    pendingBackup = null;
    toast("Import berhasil secara transaksional.");
  }
  if (key === "persist")
    toast(
      (await navigator.storage?.persist())
        ? "Penyimpanan persisten diizinkan."
        : "Browser belum mengizinkan. Tetap lakukan backup.",
    );
  if (key === "storage") {
    const e = await navigator.storage.estimate();
    toast(
      `Terpakai ${(e.usage / 1048576).toFixed(2)} MB dari ${(e.quota / 1048576).toFixed(0)} MB.`,
    );
  }
  if (key === "update-check") {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.update();
      toast("Pemeriksaan pembaruan selesai.");
    } else toast("Service worker tersedia pada build produksi.");
  }
  await render();
}
async function saveQuiz() {
  await put("settings", {
    id: "activeQuiz",
    status: "running",
    ids: quizQueue,
    index: quizIndex,
    deadline: quizDeadline,
    runId: quizRunId,
    questionStart,
  });
}
async function finishQuiz() {
  const runId = quizRunId;
  quizDeadline = 0;
  quizQueue = [];
  activeQuestion = null;
  const attempts = (await all("attempts")).filter((a) => a.runId === runId);
  if (runId)
    await put("settings", {
      id: "quiz-result-" + runId,
      kind: "quiz-result",
      date: today(),
      answered: attempts.length,
      correct: attempts.filter((a) => a.correct).length,
      seconds: attempts.reduce((sum, a) => sum + a.seconds, 0),
    });
  await put("settings", { id: "activeQuiz", status: "completed" });
  quizRunId = null;
}
async function submit(e) {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  try {
    if (form.dataset.form === "lpdp-answer") {
      if (form.dataset.submitting) return;
      form.dataset.submitting = "true";
      try {
        await lpdp.submitLpdpAnswer(f.answer);
        await render();
      } finally {
        delete form.dataset.submitting;
      }
      return;
    }
    if (form.dataset.form === "answer") {
      if (form.dataset.answered) return;
      const q = data.questions.find((q) => q.id === form.dataset.id);
      if (!f.answer?.trim()) throw Error("Isi jawaban terlebih dahulu");
      const correct =
        f.answer.trim().toLowerCase() === q.answer.trim().toLowerCase();
      if (quizDeadline && Date.now() > quizDeadline) {
        await finishQuiz();
        await render();
        toast("Waktu tryout habis.");
        return;
      }
      await put("attempts", {
        runId: quizRunId,
        questionId: q.id,
        prompt: q.prompt,
        category: q.category,
        answer: f.answer,
        correct,
        seconds: Math.max(0, Math.round((Date.now() - questionStart) / 1000)),
        date: today(),
        createdAt: new Date().toISOString(),
      });
      if (!correct)
        await put("errorLogs", {
          questionId: q.id,
          title: q.prompt,
          cause: "Tidak memahami konsep",
          correction: q.explanation,
          review: today(),
          resolved: false,
        });
      form.dataset.answered = "true";
      form.querySelector("button").disabled = true;
      $("#answer-result").innerHTML =
        `<div class="notice ${correct ? "success" : ""}"><strong>${correct ? "Benar!" : "Belum tepat."}</strong> Jawaban: ${esc(q.answer)}<p>${esc(q.explanation)}</p></div>${quizQueue.length ? button("Soal berikutnya →", "quiz-next") : ""}`;
      await load();
      return;
    }
    if (form.dataset.form === "schedule") {
      const days = {};
      for (let i = 0; i < 7; i++)
        days[i] = {
          rest: f["rest" + i] === "on",
          category: f["category" + i],
          activities: f["activities" + i].split("\n").filter((x) => x.trim()),
        };
      await put("settings", { id: "schedule", days });
    }
    if (form.dataset.form === "toefl") {
      if (Number(f.target) <= 0) throw Error("Target harus positif");
      await put("settings", { id: "toefl", target: Number(f.target) });
    }
    toast("Tersimpan.");
    await render();
  } catch (err) {
    toast(err.message);
  }
}
async function change(e) {
  try {
    if (e.target.id === "lpdp-category" || e.target.id === "lpdp-difficulty") {
      if (e.target.id === "lpdp-category") lpdpFilter = e.target.value;
      else lpdpDifficulty = e.target.value;
      await render();
      return;
    }
    if (e.target.dataset.task) {
      const t = await get("studyTasks", e.target.dataset.task);
      await put("studyTasks", { ...t, done: e.target.checked });
      await render();
    }
    if (e.target.id === "plan-date") {
      planDate = e.target.value || today();
      $("#planner-tasks").innerHTML = tasksHTML(planDate);
    }
    if (e.target.id === "roadmap-filter" || e.target.id === "question-filter") {
      filter = e.target.value;
      await render();
    }
    if (e.target.id === "theme") {
      localStorage.setItem("theme", e.target.value);
      document.documentElement.dataset.theme = e.target.value;
    }
    if (e.target.id === "backup-file") {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) throw Error("Backup maksimal 25 MB");
      pendingBackup = validate(JSON.parse(await file.text()));
      $("#backup-preview").innerHTML = `<h3>Preview backup</h3>${Object.entries(
        pendingBackup.data,
      )
        .map(([s, rows]) => `<p>${s}: ${rows.length}</p>`)
        .join(
          "",
        )}<div class="actions">${button("Merge data", "backup-merge")}${button("Replace seluruh data", "backup-replace")}</div>`;
    }
    if (e.target.id === "question-import") {
      const b = JSON.parse(await e.target.files[0].text());
      if (
        b.app !== "sobri-questions" ||
        b.version !== 1 ||
        !Array.isArray(b.questions)
      )
        throw Error("Format soal tidak valid");
      const questionIDs = new Set();
      for (const q of b.questions) {
        validateQuestion(q);
        if (questionIDs.has(q.id)) throw Error("ID soal duplikat");
        questionIDs.add(q.id);
      }
      if (confirm(`Import ${b.questions.length} soal? ID sama akan ditimpa.`)) {
        await transaction(["questions"], "readwrite", (tx) => {
          for (const q of b.questions)
            tx.objectStore("questions").put({
              ...q,
              updatedAt: new Date().toISOString(),
            });
        });
        await render();
        toast("Soal diimpor.");
      }
    }
    if (e.target.id === "timer-note") {
      const active = await timer.current();
      if (active && ["running", "paused"].includes(active.status))
        await put("settings", { ...active, note: e.target.value });
    }
    if (e.target.id === "audio-file") {
      if (audioURL) URL.revokeObjectURL(audioURL);
      audioURL = URL.createObjectURL(e.target.files[0]);
      $("#local-audio").src = audioURL;
    }
  } catch (err) {
    toast("Gagal: " + err.message);
  }
}
export async function start() {
  let initialized = false;
  window.addEventListener("hashchange", () => {
    filter = "";
    if (initialized) render().catch((e) => toast(e.message));
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (b)
      action(b.dataset.action).catch((err) =>
        toast("Gagal menyimpan: " + err.message),
      );
  });
  document.addEventListener("submit", submit);
  document.addEventListener("change", change);
  window.addEventListener("online", connection);
  window.addEventListener("offline", connection);
  await seed();
  initialized = true;
  await render();
  setInterval(() => {
    const lpdpRun = data.settings?.find((s) => s.id === lpdp.ACTIVE_ID);
    if (lpdpRun?.status === "running" && lpdpRun.deadline) {
      const remaining = Math.max(
        0,
        Math.ceil((lpdpRun.deadline - Date.now()) / 1000),
      );
      const countdown = $("#lpdp-countdown");
      if (countdown)
        countdown.textContent = `Sisa waktu ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
      if (!remaining && !lpdpExpiryBusy) {
        lpdpExpiryBusy = true;
        lpdp
          .finishLpdpRun("expired")
          .then(() => render())
          .catch((e) => toast(e.message))
          .finally(() => {
            lpdpExpiryBusy = false;
          });
      }
    }

    if (quizDeadline) {
      const qclock = $("#quiz-clock");
      if (qclock)
        qclock.textContent =
          " · Sisa tryout " +
          Math.max(0, Math.ceil((quizDeadline - Date.now()) / 1000)) +
          " detik";
      if (Date.now() >= quizDeadline) {
        finishQuiz()
          .then(() => render())
          .then(() =>
            toast("Waktu tryout habis. Jawaban tersimpan tetap tersedia."),
          )
          .catch((e) => toast(e.message));
      }
    }
    updateTimer().catch(() => {});
    const q = $("#question-clock");
    if (q) q.textContent = Math.floor((Date.now() - questionStart) / 1000);
  }, 1000);
}
