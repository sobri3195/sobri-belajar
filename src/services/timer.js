import { get, put, uid, transaction } from "../db/indexeddb.js";
export function elapsed(s, now = Date.now()) {
  return Math.min(
    s.planned * 60,
    Math.max(
      0,
      (s.accumulated || 0) +
        (s.status === "running" ? (now - s.startedAt) / 1000 : 0),
    ),
  );
}
export async function current() {
  return get("settings", "activeTimer");
}
export async function begin(minutes, category, note = "") {
  const s = {
    id: "activeTimer",
    sessionId: uid(),
    planned: minutes,
    category,
    note,
    accumulated: 0,
    startedAt: Date.now(),
    createdAt: new Date().toISOString(),
    status: "running",
  };
  await put("settings", s);
  return s;
}
export async function pause() {
  const s = await current();
  if (s?.status === "running")
    await put("settings", { ...s, accumulated: elapsed(s), status: "paused" });
}
export async function resume() {
  const s = await current();
  if (s?.status === "paused")
    await put("settings", { ...s, startedAt: Date.now(), status: "running" });
}
export async function finish(completed) {
  const s = await current();
  if (!s || !["running", "paused"].includes(s.status)) return;
  await transaction(["studySessions", "settings"], "readwrite", (tx) => {
    tx.objectStore("studySessions").put({
      id: s.sessionId,
      category: s.category,
      note: s.note,
      planned: s.planned,
      seconds: elapsed(s),
      status: completed ? "completed" : "ended",
      date: new Date().toLocaleDateString("en-CA"),
      createdAt: s.createdAt,
      endedAt: new Date().toISOString(),
    });
    tx.objectStore("settings").put({
      ...s,
      status: "idle",
      updatedAt: new Date().toISOString(),
    });
  });
}
