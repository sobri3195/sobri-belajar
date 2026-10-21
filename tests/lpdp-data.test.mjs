import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const bank = JSON.parse(
  readFileSync(
    new URL("../src/data/bank_soal_lpdp_latihan_30.json", import.meta.url),
  ),
);
const expected = [
  "tersirat",
  "dinamis",
  "suhu",
  "gambar rancangan",
  "Digitalisasi perlu disertai pemerataan akses.",
  "Kenaikan kunjungan belum dapat diatribusikan hanya pada jadwal layanan.",
  "Peserta diminta mengisi formulir sebelum wawancara.",
  "upaya mengurangi risiko",
  "Sebagian besar calon peserta memiliki perangkat dan koneksi yang memadai.",
  "Jumlah soal selesai dan akurasi memberi gambaran kinerja yang berbeda.",
  `Rp${(240000 * (1 - 0.15)).toLocaleString("id-ID")}`,
  String((64 * 3) / (3 + 5)),
  String((5 * 72 + 84) / 6),
  String((11 + 7) / (3 - 2)),
  String([1, 2, 3, 4].reduce((n) => 2 * n + 1, 3)),
  `${String(150 / 60).replace(".", ",")} jam`,
  String(1 / (1 / 6 + 1 / 12)),
  "2/15",
  `${((180 - 120) / 120) * 100}%`,
  `${((0.3 * 200) / (200 + 100)) * 100}%`,
  "Sebagian dokter mematuhi protokol.",
  "Proposal tidak disetujui.",
  "D – A – B – C",
  String(40 - (25 + 20 - 10)),
  "Ada peserta yang tidak mengumpulkan esai.",
  "Rani membawa kartu identitas.",
  "P",
  "Jika saya tidak membuat catatan, maka saya tidak belajar.",
  "Tidak ada laporan final berstatus draft.",
  "Umpan balik mentor relevan dengan perbaikan kualitas esai.",
];
test("bank is original, complete and has ten questions per category", () => {
  assert.equal(bank.questions.length, 30);
  assert.match(bank.notice, /BUKAN SOAL RESMI/);
  assert.equal(new Set(bank.questions.map((q) => q.id)).size, 30);
  for (const c of ["Verbal", "Numerik", "Penalaran Logis"])
    assert.equal(bank.questions.filter((q) => q.category === c).length, 10);
});
for (const [index, q] of bank.questions.entries())
  test(`${q.id}: answer content matches independent audit and complete metadata`, () => {
    assert.deepEqual(Object.keys(q.options), ["A", "B", "C", "D", "E"]);
    assert.equal(new Set(Object.values(q.options)).size, 5);
    assert.equal(q.options[q.correct_answer], expected[index]);
    assert.ok(q.question.length > 20);
    assert.ok(q.explanation.length > 50);
    assert.ok(q.source.includes("bukan soal resmi"));
    assert.ok(q.subcategory);
    assert.ok(["Mudah", "Sedang", "Sulit"].includes(q.difficulty));
    assert.ok(
      Number.isInteger(q.estimated_seconds) && q.estimated_seconds >= 30,
    );
  });
test("logical seating and order constraints have unique solutions", () => {
  function perms(xs) {
    return xs.length
      ? xs.flatMap((x, i) =>
          perms(xs.filter((_, j) => i !== j)).map((t) => [x, ...t]),
        )
      : [[]];
  }
  const order = perms(["A", "B", "C", "D"]).filter(
    (a) =>
      a.indexOf("A") < a.indexOf("B") &&
      a.indexOf("B") < a.indexOf("C") &&
      a.indexOf("D") < a.indexOf("A"),
  );
  assert.deepEqual(order, [["D", "A", "B", "C"]]);
  const seats = perms(["P", "Q", "R"]).filter(
    (a) => a[0] !== "P" && a.indexOf("Q") + 1 === a.indexOf("R"),
  );
  assert.deepEqual(seats, [["Q", "R", "P"]]);
  assert.equal(4 * 3 * 15, 2 * 10 * 9);
});
