import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const source = JSON.parse(
  readFileSync(
    new URL("../src/data/bank_soal_lpdp_latihan_30.json", import.meta.url),
  ),
);
async function records(page, store) {
  return page.evaluate(async (store) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("sobri-study", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return new Promise((resolve) => {
      const req = db.transaction(store).objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }, store);
}
async function open(page) {
  await page.goto("/#LPDP");
  await expect(page.locator("#lpdp-practice h2")).toHaveText(
    "Latihan skolastik LPDP",
  );
}
async function answer(page, raw, wrong = false) {
  const key = wrong
    ? Object.keys(raw.options).find((k) => k !== raw.correct_answer)
    : raw.correct_answer;
  await page
    .locator('[data-form="lpdp-answer"]')
    .getByLabel(`${key}. ${raw.options[key]}`, { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Kirim jawaban LPDP", exact: true })
    .click();
  await expect(page.locator("#lpdp-answer-result")).toContainText(
    raw.explanation,
  );
  await expect(page.locator("#lpdp-answer-result")).toContainText(
    wrong ? "0/1" : "1/1",
  );
}
for (const mode of ["Practice Mode", "Timed Practice"])
  test(`${mode}: all 30 questions can be answered, scored and persisted`, async ({
    page,
  }) => {
    await open(page);
    await expect(page.locator("[data-lpdp-catalog-id]")).toHaveCount(30);
    await page.getByRole("button", { name: mode, exact: true }).click();
    for (let i = 0; i < 30; i++) {
      const raw = source.questions[i];
      await expect(page.locator("[data-lpdp-id]")).toHaveAttribute(
        "data-lpdp-id",
        `lpdp-l30-${raw.id}`,
      );
      await answer(page, raw);
      if (i === 0) {
        await page.reload();
        await expect(page.locator("#lpdp-answer-result")).toContainText(
          raw.explanation,
        );
        await expect(
          page.getByRole("button", { name: "Kirim jawaban LPDP", exact: true }),
        ).toBeDisabled();
      }
      await page
        .getByRole("button", {
          name: i === 29 ? "Lihat hasil latihan" : "Soal berikutnya LPDP",
          exact: true,
        })
        .click();
    }
    await expect(page.locator("#lpdp-summary")).toContainText(
      "Skor 100/100 · 30/30 benar",
    );
    const attempts = (await records(page, "attempts")).filter(
      (a) => a.category === "LPDP",
    );
    expect(attempts).toHaveLength(30);
    expect(new Set(attempts.map((a) => a.questionId)).size).toBe(30);
    expect(
      attempts.every(
        (a) =>
          a.correct &&
          a.explanation &&
          a.seconds >= 0 &&
          a.estimatedSeconds > 0,
      ),
    ).toBe(true);
    await page.reload();
    await expect(page.locator("#lpdp-summary")).toContainText("30/30 benar");
  });
test("category and difficulty filters, wrong-answer review and offline writes", async ({
  page,
  context,
}) => {
  await open(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page
    .getByLabel("Kategori soal LPDP", { exact: true })
    .selectOption("Numerik");
  await expect(page.locator("[data-lpdp-catalog-id]")).toHaveCount(10);
  await page
    .getByLabel("Kesulitan LPDP", { exact: true })
    .selectOption("Mudah");
  const expected = source.questions.filter(
    (q) => q.category === "Numerik" && q.difficulty === "Mudah",
  ).length;
  await expect(page.locator("[data-lpdp-catalog-id]")).toHaveCount(expected);
  await page
    .getByLabel("Kategori soal LPDP", { exact: true })
    .selectOption("Semua");
  await page
    .getByLabel("Kesulitan LPDP", { exact: true })
    .selectOption("Semua");
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Practice Mode", exact: true })
    .click();
  await answer(page, source.questions[0], true);
  await page
    .getByRole("button", { name: "Soal berikutnya LPDP", exact: true })
    .click();
  await answer(page, source.questions[1]);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Akhiri latihan", exact: true })
    .click();
  await expect(page.locator("#lpdp-summary")).toContainText("1/30 benar");
  await page
    .getByRole("button", { name: "Review soal salah (1)", exact: true })
    .click();
  await expect(page.locator("[data-lpdp-id]")).toHaveAttribute(
    "data-lpdp-id",
    "lpdp-l30-LPDP-L30-01",
  );
  await answer(page, source.questions[0]);
  await page
    .getByRole("button", { name: "Lihat hasil latihan", exact: true })
    .click();
  await expect(page.locator("#lpdp-summary")).toContainText("1/1 benar");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Review soal salah (0)", exact: true }),
  ).toBeVisible();
  expect((await records(page, "attempts")).length).toBe(3);
  expect((await records(page, "errorLogs")).length).toBe(1);
});
test("seed upgrades an existing user without overwriting edits or progress; backup retains raw metadata", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const req = indexedDB.open("sobri-study", 1);
      req.onsuccess = () => resolve(req.result);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(["questions", "notes"], "readwrite");
      const st = tx.objectStore("questions");
      const r = st.get("lpdp-l30-LPDP-L30-01");
      r.onsuccess = () =>
        st.put({
          ...r.result,
          prompt: "Catatan soal pribadi",
          bookmarked: true,
        });
      st.delete("lpdp-l30-LPDP-L30-02");
      tx.objectStore("notes").put({
        id: "existing-note",
        title: "Jangan hapus",
        category: "LPDP",
        body: "Progres pengguna",
        revisions: [],
      });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  });
  await page.reload();
  const questions = (await records(page, "questions")).filter(
    (q) => q.category === "LPDP",
  );
  expect(questions).toHaveLength(30);
  expect(questions.find((q) => q.id === "lpdp-l30-LPDP-L30-01")).toMatchObject({
    prompt: "Catatan soal pribadi",
    bookmarked: true,
  });
  expect((await records(page, "notes"))[0].body).toBe("Progres pengguna");
  await page.reload();
  expect(
    (await records(page, "questions")).filter((q) => q.category === "LPDP"),
  ).toHaveLength(30);
  for (const raw of source.questions) {
    const record = questions.find((q) => q.original.id === raw.id);
    expect(record.original).toEqual(raw);
    expect(record.estimatedSeconds).toBe(raw.estimated_seconds);
    expect(record.options).toContain(record.answer);
  }
  await page
    .locator('[data-action="lpdp-single:lpdp-l30-LPDP-L30-01"]')
    .click();
  await answer(page, source.questions[0]);
  await page
    .getByRole("button", { name: "Lihat hasil latihan", exact: true })
    .click();
  await expect(page.locator("#lpdp-summary")).toContainText("1/1 benar");
  await page.goto("/#settings");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ Export seluruh data" }).click();
  const download = await downloadEvent;
  const backup = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(
    backup.data.questions.filter((q) => q.bankId === source.id),
  ).toHaveLength(30);
  expect(
    backup.data.attempts.filter((a) => a.category === "LPDP"),
  ).toHaveLength(1);
  expect(backup.data.settings.some((s) => s.kind === "lpdp-result")).toBe(true);
  await page.locator("#backup-file").setInputFiles(await download.path());
  await expect(page.locator("#backup-preview")).toContainText("questions: 33");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Merge data", exact: true }).click();
  await expect(page.locator("#toast")).toContainText("Import berhasil");
  expect(
    (await records(page, "questions")).filter((q) => q.category === "LPDP"),
  ).toHaveLength(30);
});
test("deadline expiration counts unanswered questions as zero without inventing attempts", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-21T08:00:00") });
  await open(page);
  await page
    .getByRole("button", { name: "Timed Practice", exact: true })
    .click();
  await expect(page.locator("[data-lpdp-id]")).toBeVisible();
  const run = (await records(page, "settings")).find(
    (s) => s.id === "lpdp-active-practice",
  );
  await answer(page, source.questions[0]);
  await page
    .getByRole("button", { name: "Soal berikutnya LPDP", exact: true })
    .click();
  await page.clock.fastForward(run.estimatedSeconds * 1000 + 1000);
  await expect(page.locator("#lpdp-summary")).toContainText("Waktu habis");
  await expect(page.locator("#lpdp-summary")).toContainText("1/30 benar");
  expect(await records(page, "attempts")).toHaveLength(1);
  expect(
    (await records(page, "settings")).filter((s) => s.kind === "lpdp-result"),
  ).toHaveLength(1);
});
