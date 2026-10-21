import bank from "./bank_soal_lpdp_latihan_30.json";
import { transaction } from "../db/indexeddb.js";
import { validateQuestion } from "../services/backup.js";
export const LPDP_BANK_ID = bank.id;
export const lpdpQuestions = bank.questions.map((raw) => {
  const optionKeys = Object.keys(raw.options);
  const options = optionKeys.map((key) => `${key}. ${raw.options[key]}`);
  const q = {
    id: `lpdp-l30-${raw.id}`,
    bankId: bank.id,
    bankVersion: bank.version,
    category: "LPDP",
    subcategory: raw.category,
    topic: raw.subcategory,
    type: "mcq",
    difficulty: raw.difficulty,
    estimatedSeconds: raw.estimated_seconds,
    prompt: raw.question,
    options,
    optionKeys,
    answerKey: raw.correct_answer,
    answer: options[optionKeys.indexOf(raw.correct_answer)],
    explanation: raw.explanation,
    source: raw.source,
    sample: true,
    original: raw,
    bankMetadata: {
      id: bank.id,
      version: bank.version,
      title: bank.title,
      notice: bank.notice,
    },
  };
  validateQuestion(q);
  if (
    !Number.isInteger(q.estimatedSeconds) ||
    q.estimatedSeconds <= 0 ||
    new Set(options).size !== options.length
  )
    throw Error(`Soal LPDP tidak valid: ${raw.id}`);
  return q;
});
if (
  lpdpQuestions.length !== 30 ||
  new Set(lpdpQuestions.map((q) => q.id)).size !== 30
)
  throw Error("Bank LPDP harus berisi 30 ID unik");
// Check each ID within the write transaction: safe across tabs, repairs missing seeds,
// and never overwrites a user's edits, attempts, bookmarks, or other questions.
export async function seedLpdpQuestions() {
  await transaction(["questions"], "readwrite", (tx) => {
    const store = tx.objectStore("questions");
    for (const q of lpdpQuestions) {
      const request = store.get(q.id);
      request.onsuccess = () => {
        if (!request.result) {
          const now = new Date().toISOString();
          store.add({ ...q, createdAt: now, updatedAt: now });
        }
      };
    }
  });
}
