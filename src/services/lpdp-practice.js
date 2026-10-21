import { all, get, put, transaction, uid } from "../db/indexeddb.js";
export const ACTIVE_ID = "lpdp-active-practice";
export const isLpdp = (q) => q.category === "LPDP";
export function latestWrongQuestions(questions, attempts) {
  const latest = new Map();
  for (const a of attempts
    .filter((a) => a.category === "LPDP")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")))
    latest.set(a.questionId, a);
  return questions.filter(
    (q) => isLpdp(q) && latest.get(q.id)?.correct === false,
  );
}
export function scoreRun(run, attempts) {
  const answers = attempts.filter((a) => a.runId === run.runId);
  const correct = answers.filter((a) => a.correct).length;
  return {
    total: run.ids.length,
    answered: answers.length,
    correct,
    wrong: answers.length - correct,
    unanswered: run.ids.length - answers.length,
    score: run.ids.length ? Math.round((correct / run.ids.length) * 100) : 0,
  };
}
export async function currentLpdpRun() {
  return get("settings", ACTIVE_ID);
}
export async function startLpdpRun(ids, mode) {
  if (!ids.length || !["practice", "timed", "review"].includes(mode))
    throw Error("Pilih soal untuk memulai latihan.");
  const questions = await all("questions");
  const selected = ids.map((id) =>
    questions.find((q) => q.id === id && isLpdp(q)),
  );
  if (selected.some((q) => !q)) throw Error("Soal LPDP tidak tersedia.");
  const now = Date.now();
  const seconds = selected.reduce(
    (sum, q) => sum + (q.estimatedSeconds || 90),
    0,
  );
  return put("settings", {
    id: ACTIVE_ID,
    runId: uid(),
    kind: "lpdp-practice",
    mode,
    status: "running",
    ids: [...new Set(ids)],
    index: 0,
    startedAt: now,
    questionStart: now,
    deadline: mode === "timed" ? now + seconds * 1000 : 0,
    estimatedSeconds: seconds,
  });
}
function resultRecord(run, attempts, reason) {
  const summary = scoreRun(run, attempts);
  return {
    id: "lpdp-result-" + run.runId,
    kind: "lpdp-result",
    runId: run.runId,
    mode: run.mode,
    status: reason,
    date: new Date().toLocaleDateString("en-CA"),
    endedAt: new Date().toISOString(),
    ...summary,
    seconds: Math.max(0, Math.round((Date.now() - run.startedAt) / 1000)),
    ids: run.ids,
  };
}
export async function finishLpdpRun(reason = "completed") {
  await transaction(["settings", "attempts"], "readwrite", (tx) => {
    const settings = tx.objectStore("settings");
    const read = settings.get(ACTIVE_ID);
    read.onsuccess = () => {
      const run = read.result;
      if (run?.status !== "running") return;
      const req = tx.objectStore("attempts").getAll();
      req.onsuccess = () => {
        const end =
          run.deadline && Date.now() >= run.deadline ? "expired" : reason;
        settings.put({
          ...run,
          status: end,
          endedAt: new Date().toISOString(),
        });
        settings.put(resultRecord(run, req.result, end));
      };
    };
  });
}
export async function submitLpdpAnswer(answer) {
  let outcome;
  await transaction(
    ["settings", "questions", "attempts", "errorLogs"],
    "readwrite",
    (tx) => {
      const settings = tx.objectStore("settings");
      const read = settings.get(ACTIVE_ID);
      read.onsuccess = () => {
        const run = read.result;
        if (run?.status !== "running") {
          outcome = { error: "Tidak ada latihan aktif." };
          return;
        }
        if (run.deadline && Date.now() >= run.deadline) {
          outcome = { expired: true };
          return;
        }
        const id = run.ids[run.index];
        const attemptID = `lpdp-${run.runId}-${id}`;
        const attempts = tx.objectStore("attempts");
        const existing = attempts.get(attemptID);
        existing.onsuccess = () => {
          if (existing.result) {
            outcome = { attempt: existing.result };
            return;
          }
          const rq = tx.objectStore("questions").get(id);
          rq.onsuccess = () => {
            const q = rq.result;
            if (!q || !q.options.includes(answer)) {
              outcome = { error: "Pilih jawaban yang tersedia." };
              return;
            }
            const now = new Date().toISOString();
            const attempt = {
              id: attemptID,
              runId: run.runId,
              mode: run.mode,
              questionId: id,
              prompt: q.prompt,
              category: q.category,
              subcategory: q.subcategory,
              answer,
              correct: answer === q.answer,
              correctAnswer: q.answer,
              explanation: q.explanation,
              estimatedSeconds: q.estimatedSeconds || 90,
              seconds: Math.max(
                0,
                Math.round((Date.now() - run.questionStart) / 1000),
              ),
              date: new Date().toLocaleDateString("en-CA"),
              createdAt: now,
              updatedAt: now,
            };
            attempts.add(attempt);
            if (!attempt.correct)
              tx.objectStore("errorLogs").put({
                id: "error-" + attemptID,
                questionId: id,
                attemptId: attemptID,
                title: q.prompt,
                cause: "Tidak memahami konsep",
                correction: q.explanation,
                review: attempt.date,
                resolved: false,
                createdAt: now,
                updatedAt: now,
              });
            outcome = { attempt };
          };
        };
      };
    },
  );
  if (outcome?.expired) {
    await finishLpdpRun("expired");
    throw Error(
      "Waktu latihan habis. Jawaban yang belum dikirim tidak dinilai.",
    );
  }
  if (outcome?.error) throw Error(outcome.error);
  return outcome?.attempt;
}
export async function nextLpdpQuestion() {
  let finish = false;
  await transaction(["settings", "attempts"], "readwrite", (tx) => {
    const settings = tx.objectStore("settings");
    const r = settings.get(ACTIVE_ID);
    r.onsuccess = () => {
      const run = r.result;
      if (run?.status !== "running") return;
      const attempt = tx
        .objectStore("attempts")
        .get(`lpdp-${run.runId}-${run.ids[run.index]}`);
      attempt.onsuccess = () => {
        if (!attempt.result) return;
        if (run.index + 1 >= run.ids.length) finish = true;
        else
          settings.put({
            ...run,
            index: run.index + 1,
            questionStart: Date.now(),
            updatedAt: new Date().toISOString(),
          });
      };
    };
  });
  if (finish) await finishLpdpRun();
}
