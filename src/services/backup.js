import { stores, all, transaction } from "../db/indexeddb.js";
import { elapsed } from "./timer.js";
const safeID = (id) =>
  typeof id === "string" && /^[^"'<>`:\u0000-\u001f]{1,200}$/.test(id);
const text = (r, key, required = true) => {
  if ((required || r[key] !== undefined) && typeof r[key] !== "string")
    throw Error(`Field ${key} harus berupa teks`);
};
const number = (r, key) => {
  if (typeof r[key] !== "number" || !Number.isFinite(r[key]) || r[key] < 0)
    throw Error(`Field ${key} harus angka nonnegatif`);
};
const date = (r, key, optional = false) => {
  if (optional && (r[key] === "" || r[key] === undefined)) return;
  text(r, key);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(r[key]) ||
    !Number.isFinite(Date.parse(r[key])) ||
    new Date(r[key] + "T00:00:00Z").toISOString().slice(0, 10) !== r[key]
  )
    throw Error(`Tanggal ${key} tidak valid`);
};
export function validateQuestion(q) {
  if (!safeID(q?.id)) throw Error("ID soal tidak valid");
  for (const k of ["prompt", "category", "answer", "explanation", "source"])
    text(q, k);
  if (
    !["mcq", "boolean", "short"].includes(q.type) ||
    !Array.isArray(q.options) ||
    q.options.some((x) => typeof x !== "string") ||
    (q.type !== "short" &&
      (q.options.length < 2 || !q.options.includes(q.answer)))
  )
    throw Error("Pilihan atau jenis soal tidak valid");
  return q;
}
export async function backup() {
  const data = {};
  for (const s of stores) data[s] = await all(s);
  data.settings = data.settings.map((s) =>
    s.id === "activeTimer" && ["running", "paused"].includes(s.status)
      ? { ...s, accumulated: elapsed(s), status: "paused" }
      : s,
  );
  return {
    app: "sobri-study-roadmap",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}
export function validate(b) {
  if (b?.app !== "sobri-study-roadmap" || b.schemaVersion !== 1 || !b.data)
    throw Error("Format atau versi backup tidak didukung.");
  for (const s of stores) {
    if (!Array.isArray(b.data[s])) throw Error(`Store ${s} tidak valid`);
    const ids = new Set();
    for (const r of b.data[s]) {
      if (!r || typeof r !== "object" || !safeID(r.id) || ids.has(r.id))
        throw Error(`ID tidak valid / duplikat pada ${s}`);
      ids.add(r.id);
      switch (s) {
        case "questions":
          validateQuestion(r);
          break;
        case "roadmapMonths":
          number(r, "month");
          for (const k of ["title", "material", "status"]) text(r, k);
          date(r, "start");
          date(r, "target");
          if (
            !Array.isArray(r.checklist) ||
            r.checklist.some(
              (c) => typeof c.title !== "string" || typeof c.done !== "boolean",
            )
          )
            throw Error("Checklist roadmap tidak valid");
          break;
        case "topics":
          for (const k of [
            "category",
            "title",
            "objective",
            "summary",
            "status",
          ])
            text(r, k);
          number(r, "mastery");
          break;
        case "studyTasks":
          text(r, "title");
          text(r, "category");
          date(r, "date");
          number(r, "minutes");
          if (typeof r.done !== "boolean")
            throw Error("Status tugas tidak valid");
          break;
        case "studySessions":
          for (const k of ["category", "status", "endedAt"]) text(r, k);
          date(r, "date");
          number(r, "seconds");
          number(r, "planned");
          break;
        case "attempts":
          for (const k of ["questionId", "answer", "category"]) text(r, k);
          date(r, "date");
          number(r, "seconds");
          if (typeof r.correct !== "boolean")
            throw Error("Status jawaban tidak valid");
          break;
        case "flashcards":
          for (const k of ["front", "back", "category"]) text(r, k);
          date(r, "review");
          number(r, "interval");
          if (!Array.isArray(r.reviews))
            throw Error("Riwayat kartu tidak valid");
          break;
        case "errorLogs":
          for (const k of ["title", "cause", "correction"]) text(r, k);
          date(r, "review");
          break;
        case "notes":
          for (const k of ["title", "body", "category"]) text(r, k);
          if (
            !Array.isArray(r.revisions) ||
            r.revisions.some(
              (x) => typeof x.date !== "string" || typeof x.body !== "string",
            )
          )
            throw Error("Revisi tidak valid");
          break;
        case "weeklyReviews":
        case "monthlyReviews":
          text(r, "period");
          text(r, "body");
          date(r, "date");
          break;
        case "researchProjects":
          text(r, "title");
          text(r, "status");
          date(r, "deadline", true);
          break;
        case "documents":
          text(r, "title");
          text(r, "status");
          date(r, "checked", true);
          date(r, "deadline", true);
          break;
        case "settings":
          if (
            r.id === "activeTimer" &&
            ["running", "paused"].includes(r.status)
          ) {
            number(r, "planned");
            number(r, "accumulated");
            number(r, "startedAt");
            text(r, "sessionId");
            text(r, "category");
          }
          if (r.id === "activeQuiz" && r.status === "running") {
            if (
              !Array.isArray(r.ids) ||
              !r.ids.length ||
              r.ids.some((id) => !safeID(id)) ||
              !Number.isInteger(r.index) ||
              r.index < 0 ||
              r.index >= r.ids.length
            )
              throw Error("Sesi tryout tidak valid");
            number(r, "deadline");
            number(r, "questionStart");
            text(r, "runId");
          }
          if (r.id === "toefl") number(r, "target");
          if (r.kind === "english-score") {
            number(r, "score");
            date(r, "date");
          }
          if (r.kind === "quiz-result") {
            number(r, "correct");
            number(r, "answered");
            number(r, "seconds");
            date(r, "date");
          }
          if (r.id === "schedule") {
            if (!r.days || typeof r.days !== "object")
              throw Error("Jadwal tidak valid");
            for (let i = 0; i < 7; i++) {
              const d = r.days[i];
              if (
                !d ||
                typeof d.rest !== "boolean" ||
                typeof d.category !== "string" ||
                !Array.isArray(d.activities) ||
                d.activities.some((x) => typeof x !== "string")
              )
                throw Error("Jadwal harian tidak valid");
            }
          }
          break;
      }
    }
  }
  return b;
}
export async function restore(b, replace) {
  validate(b);
  await transaction(stores, "readwrite", (tx) => {
    for (const s of stores) {
      const st = tx.objectStore(s);
      if (replace) st.clear();
      for (const row of b.data[s]) {
        const r =
          s === "settings" &&
          row.id === "activeTimer" &&
          ["running", "paused"].includes(row.status)
            ? { ...row, status: "paused" }
            : row;
        st.put(r);
      }
    }
  });
}
export function download(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
