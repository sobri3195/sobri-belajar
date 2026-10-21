import { test, expect } from "@playwright/test";
async function read(page, store) {
  return page.evaluate(async (s) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("sobri-study", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return new Promise((resolve) => {
      const r = db.transaction(s).objectStore(s).getAll();
      r.onsuccess = () => resolve(r.result);
    });
  }, store);
}
async function nav(page, route) {
  await page.goto("/#" + encodeURIComponent(route));
  const titles = {
    dashboard: "Dashboard",
    planner: "Planner Harian",
    roadmap: "Roadmap 12 Bulan",
    questions: "Bank Soal",
    cards: "Flashcards",
    errors: "Error Log",
    progress: "Progres & Evaluasi",
    notes: "Catatan",
    settings: "Data & Pengaturan",
    Administration: "Administrasi",
    Research: "Research & Publication",
  };
  await expect(page.locator("header .breadcrumb strong")).toHaveText(
    titles[route] || route,
  );
}
test("dashboard starts honestly, checklist persists and roadmap edits", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toContainText("Sobri");
  await expect(page.locator(".stat").nth(1)).toContainText("0");
  await page.getByRole("button", { name: "+ Siapkan jadwal hari ini" }).click();
  await expect(page.locator(".task")).toHaveCount(4);
  await page.locator(".task input").first().check();
  await page.reload();
  await expect(page.locator(".task input").first()).toBeChecked();
  await nav(page, "roadmap");
  await page.getByRole("button", { name: "Buka & edit ↗" }).first().click();
  await page.getByLabel("Judul", { exact: true }).fill("Fondasi terarah");
  await page
    .getByLabel("Status", { exact: true })
    .selectOption("Sedang dipelajari");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Fondasi terarah" }),
  ).toBeVisible();
  expect((await read(page, "roadmapMonths")).length).toBe(12);
});
test("timer recovers, pause excludes elapsed time, confirmed actual session", async ({
  page,
}) => {
  await nav(page, "planner");
  await page.locator('[data-action="timer-start"]').click();
  await expect
    .poll(
      async () =>
        (await read(page, "settings")).find((x) => x.id === "activeTimer")
          ?.status,
    )
    .toBe("running");
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator("#timer-status")).toHaveText("Sedang fokus");
  await page.locator('[data-action="timer-pause"]').click();
  await expect(page.locator("#timer-status")).toHaveText("Dijeda");
  const paused = (await read(page, "settings")).find(
    (x) => x.id === "activeTimer",
  ).accumulated;
  await page.waitForTimeout(1100);
  await page.locator('[data-action="timer-resume"]').click();
  await page.waitForTimeout(1100);
  await page.locator('[data-action="timer-finish"]').click();
  await page.getByLabel("Durasi aktual (detik)").fill("2");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect
    .poll(async () => (await read(page, "studySessions")).length)
    .toBe(1);
  const s = (await read(page, "studySessions"))[0];
  expect(s.seconds).toBe(2);
  expect(s.status).toBe("completed");
  expect(paused).toBeGreaterThan(0);
  await nav(page, "dashboard");
  await expect(page.locator(".stat").first()).toContainText("1 sesi selesai");
});
test("questions persist, errors review, flashcard repetition and backup roundtrip", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await nav(page, "questions");
  await page.locator('[data-action="question:sample-1"]').click();
  await page.getByLabel("20", { exact: true }).check();
  await page.getByRole("button", { name: "Periksa jawaban" }).click();
  await expect(page.locator("#answer-result")).toContainText("Belum tepat");
  expect((await read(page, "attempts")).length).toBe(1);
  expect((await read(page, "errorLogs")).length).toBe(1);
  await nav(page, "errors");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page
    .getByLabel("Hasil recall / koreksi baru")
    .fill("Periksa kembali persentase.");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("main")).toContainText("Sudah direview");
  await nav(page, "cards");
  await page.getByRole("button", { name: "+ Tambah flashcard" }).click();
  await page.getByLabel("Depan", { exact: true }).fill("Cardiac output?");
  await page.getByLabel("Belakang", { exact: true }).fill("HR × SV");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await page.getByText("Lihat jawaban", { exact: true }).click();
  await page.getByRole("button", { name: "Ingat", exact: true }).click();
  expect((await read(page, "flashcards"))[0].interval).toBe(3);
  await nav(page, "settings");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ Export seluruh data" }).click();
  const download = await dl;
  const path = await download.path();
  await page.locator("#backup-file").setInputFiles(path);
  await expect(page.locator("#backup-preview")).toContainText("attempts: 1");
  await page.getByRole("button", { name: "Replace seluruh data" }).click();
  await expect(page.locator("#toast")).toContainText("Import berhasil");
  expect((await read(page, "attempts")).length).toBe(1);
  expect((await read(page, "questions")).length).toBe(33);
});
test("production shell opens offline and accepts new local data", async ({
  page,
  context,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Selamat datang/ }),
  ).toBeVisible();
  await expect(page.locator("#connection")).toContainText("offline");
  await page.getByRole("button", { name: "+ Tambah catatan" }).click();
  await page.getByLabel("Judul", { exact: true }).fill("Catatan offline");
  await page
    .getByLabel("Isi catatan / draft esai / evaluasi wawancara")
    .fill("Tersimpan tanpa koneksi.");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.reload();
  expect((await read(page, "notes"))[0].title).toBe("Catatan offline");
  await nav(page, "questions");
  await page.locator('[data-action="question:sample-1"]').click();
  await page.getByLabel("30", { exact: true }).check();
  await page.getByRole("button", { name: "Periksa jawaban" }).click();
  await expect(page.locator("#answer-result")).toContainText("Benar");
  await nav(page, "planner");
  await page.locator('[data-action="timer-start"]').click();
  await expect(page.locator("#timer-status")).toHaveText("Sedang fokus");
  await page.waitForTimeout(1100);
  await page.locator('[data-action="timer-finish"]').click();
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.reload();
  expect(await read(page, "studySessions")).toHaveLength(1);
  expect(await read(page, "attempts")).toHaveLength(1);
  expect(requests.every((r) => r.startsWith("http://127.0.0.1:4173"))).toBe(
    true,
  );
});
test("all navigation pages and mobile layout work without page errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "dashboard",
    "planner",
    "roadmap",
    "SIMAK UI",
    "BTKV",
    "LPDP",
    "English & TOEFL",
    "Research",
    "Administration",
    "questions",
    "cards",
    "errors",
    "progress",
    "notes",
    "settings",
  ]) {
    await nav(page, route);
    await expect(page.locator("main")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav(page, "dashboard");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/open/);
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Tutup navigasi", exact: true })
    .click();
  await page.screenshot({ path: "/tmp/sobri-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({ path: "/tmp/sobri-desktop.png", fullPage: true });
});

test("four timestamp-based sessions total 120 actual minutes; no automatic completion", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-20T08:00:00") });
  await nav(page, "planner");
  for (const minutes of [10, 50, 45, 15]) {
    await page.locator("#timer-duration").selectOption(String(minutes));
    await page.locator('[data-action="timer-start"]').click();
    await expect
      .poll(
        async () =>
          (await read(page, "settings")).find((s) => s.id === "activeTimer")
            ?.status,
      )
      .toBe("running");
    await page.clock.fastForward(minutes * 60000);
    await expect(page.locator("#clock")).toHaveText("00:00");
    expect((await read(page, "studySessions")).length).toBe(
      [10, 50, 45, 15].indexOf(minutes),
    );
    await page.locator('[data-action="timer-finish"]').click();
    await page
      .locator("dialog")
      .getByRole("button", { name: "Simpan", exact: true })
      .click();
    await expect(page.locator("dialog")).toHaveCount(0);
  }
  await nav(page, "dashboard");
  await expect(page.locator(".stat").first()).toContainText("120");
  await expect(page.locator(".stat").first()).toContainText("4 sesi selesai");
  const sessions = await read(page, "studySessions");
  expect(sessions.reduce((a, s) => a + s.seconds, 0)).toBe(7200);
});

test("timed mini-tryout recovers after reload and records its result", async ({
  page,
}) => {
  await nav(page, "questions");
  await page.getByRole("button", { name: "Mini-tryout (5 soal)" }).click();
  await page.getByLabel("Batas waktu (menit)").fill("5");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#quiz-clock")).toContainText("Sisa tryout");
  for (let i = 0; i < 5; i++) {
    const active = (await read(page, "settings")).find(
      (s) => s.id === "activeQuiz",
    );
    const qs = await read(page, "questions");
    const q = qs.find((q) => q.id === active.ids[active.index]);
    if (q.type === "short")
      await page.getByLabel("Jawaban", { exact: true }).fill(q.answer);
    else await page.getByLabel(q.answer, { exact: true }).check();
    await page.getByRole("button", { name: "Periksa jawaban" }).click();
    await expect(page.locator("#answer-result")).toContainText("Benar");
    await page.getByRole("button", { name: "Soal berikutnya →" }).click();
    if (i < 4)
      await expect(page.locator("[data-form=answer] button")).toBeEnabled();
  }
  await nav(page, "progress");
  await expect(page.locator("main")).toContainText("5/5 jawaban benar");
});

test("documents, research, notes revisions and English scores persist", async ({
  page,
}) => {
  await nav(page, "Administration");
  await page.getByRole("button", { name: "Perbarui dokumen" }).first().click();
  await page.getByLabel("Status", { exact: true }).selectOption("Lengkap");
  await page.getByLabel("Catatan", { exact: true }).fill("Diperiksa");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await nav(page, "Research");
  await page.getByRole("button", { name: "+ Tambah", exact: true }).click();
  await page.getByLabel("Judul", { exact: true }).fill("Tinjauan intervensi");
  await page
    .getByLabel("PICO", { exact: true })
    .fill("Population, intervention, comparison, outcome");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await nav(page, "LPDP");
  await page.getByRole("button", { name: "+ Tambah", exact: true }).click();
  await page.getByLabel("Judul", { exact: true }).fill("Draft kontribusi");
  await page
    .getByLabel("Isi catatan / draft esai / evaluasi wawancara")
    .fill("Versi pertama");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit / revisi" }).click();
  await page
    .getByLabel("Isi catatan / draft esai / evaluasi wawancara")
    .fill("Versi kedua");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  expect((await read(page, "notes"))[0].revisions[0].body).toBe(
    "Versi pertama",
  );
  await nav(page, "English & TOEFL");
  await page.getByRole("button", { name: "+ Catat skor" }).click();
  await page.getByLabel("Skor internal").fill("503");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("main")).toContainText("503");
  expect(
    (await read(page, "documents")).filter((d) => d.status === "Lengkap"),
  ).toHaveLength(1);
  expect(await read(page, "researchProjects")).toHaveLength(1);
});

test("invalid backups are rejected before replacing any data", async ({
  page,
}) => {
  await nav(page, "settings");
  const data = {};
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
    data[s] = await read(page, s);
  data.studySessions.push({ id: "bad", seconds: -50 });
  const b = { app: "sobri-study-roadmap", schemaVersion: 1, data };
  await page.locator("#backup-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(b)),
  });
  await expect(page.locator("#toast")).toContainText("Gagal");
  await expect(page.locator("#backup-preview")).toBeEmpty();
  expect(await read(page, "questions")).toHaveLength(33);
  expect(await read(page, "studySessions")).toHaveLength(0);
});

test("unfinished essay draft restores without creating fake progress", async ({
  page,
}) => {
  await nav(page, "notes");
  await page.getByRole("button", { name: "+ Tambah catatan" }).click();
  await page
    .getByLabel("Judul", { exact: true })
    .fill("Draft tersimpan otomatis");
  await page
    .getByLabel("Isi catatan / draft esai / evaluasi wawancara")
    .fill("Belum selesai menulis");
  await expect
    .poll(
      async () =>
        !!(await read(page, "settings")).find(
          (s) => s.id === "draft-note-notes",
        ),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "+ Tambah catatan" }).click();
  await expect(page.getByLabel("Judul", { exact: true })).toHaveValue(
    "Draft tersimpan otomatis",
  );
  await expect(
    page.getByLabel("Isi catatan / draft esai / evaluasi wawancara"),
  ).toHaveValue("Belum selesai menulis");
  expect(await read(page, "notes")).toHaveLength(0);
  await page
    .locator("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  expect(await read(page, "notes")).toHaveLength(1);
});
