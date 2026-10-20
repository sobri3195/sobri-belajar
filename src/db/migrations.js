// Add future migrations by increasing SCHEMA_VERSION. Never recreate populated stores.
export const SCHEMA_VERSION = 1;
export const stores = [
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
];
export function migrate(db, oldVersion) {
  if (oldVersion < 1)
    for (const name of stores)
      if (!db.objectStoreNames.contains(name))
        db.createObjectStore(name, { keyPath: "id" });
}
