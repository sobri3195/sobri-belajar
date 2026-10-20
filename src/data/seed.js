import { seedLpdpQuestions } from "./lpdp-questions.js";
import { content } from "./topic-content.js";
import { get, transaction } from "../db/indexeddb.js";
export const categories = [
  "SIMAK UI",
  "BTKV",
  "LPDP",
  "English & TOEFL",
  "Research",
  "Administration",
];
export const titles = [
  "Fondasi awal",
  "Fisiologi dan respirasi",
  "Kardiologi klinis",
  "Prinsip bedah jantung",
  "Bedah vaskular",
  "Bedah toraks",
  "Trauma toraks",
  "Perioperatif dan ICU",
  "Integrasi klinis",
  "Riset dan publikasi",
  "TOEFL dan wawancara",
  "Evaluasi komprehensif",
];
export const descriptions = [
  "Fisiologi kardiovaskular, hemodinamika, asesmen baseline, identifikasi kelemahan, SIMAK UI, LPDP, TOEFL.",
  "Fisiologi kardiovaskular dan respirasi, oxygen delivery, ECG dasar, analisis gas darah.",
  "Penyakit jantung koroner, gagal jantung, penyakit katup, penalaran klinis.",
  "Anatomi jantung, penyakit jantung bawaan, prinsip dasar bedah jantung.",
  "Penyakit arteri perifer, penyakit aorta, endovaskular, latihan kasus.",
  "Pleura, mediastinum, penyakit paru, pencitraan, latihan soal.",
  "Trauma toraks, kegawatan respirasi, pencitraan dasar, simulasi kasus.",
  "Syok, ventilasi, anestesi dasar, keselamatan pasien, kasus integratif.",
  "Bank soal intensif, systematic review, SIMAK dan LPDP, analisis kesalahan.",
  "Statistik, critical appraisal, portofolio, persiapan manuskrip.",
  "TOEFL intensif, medical English, dokumen, simulasi wawancara.",
  "Tryout, simulasi wawancara, finalisasi dokumen, evaluasi kesiapan.",
];
export const schedule = [
  ["Istirahat", "Review ringan opsional"],
  [
    "SIMAK UI",
    "Spaced repetition",
    "Kemampuan akademik",
    "Numerik, verbal, logika",
    "Error log",
  ],
  [
    "BTKV",
    "Recall materi",
    "Fisiologi atau klinis",
    "Vignette dan kasus",
    "Ringkasan",
  ],
  [
    "LPDP",
    "Review konsep",
    "Materi skolastik",
    "Latihan berbatas waktu",
    "Pembahasan kesalahan",
  ],
  [
    "SIMAK UI",
    "Recall",
    "Latihan SIMAK campuran",
    "Pembahasan soal terarah",
    "Evaluasi kesalahan",
  ],
  [
    "English & TOEFL",
    "Vocabulary review",
    "Esai, English atau riset",
    "Menulis atau membaca jurnal",
    "Kesimpulan dan rencana",
  ],
  [
    "Evaluasi",
    "Recall mingguan",
    "Mini-test SIMAK atau LPDP",
    "Pembahasan dan audit dokumen",
    "Evaluasi mingguan",
  ],
];
export const topicGroups = {
  "SIMAK UI": ["Numerik", "Verbal", "Logika", "Mini-tryout"],
  BTKV: [
    "Anatomi",
    "Fisiologi",
    "Kardiologi klinis",
    "Bedah jantung",
    "Bedah vaskular",
    "Bedah toraks",
    "Trauma",
    "ICU dan perioperatif",
    "Pencitraan",
    "Penalaran klinis",
  ],
  LPDP: ["Skolastik", "Esai kontribusi", "Wawancara"],
  "English & TOEFL": [
    "Vocabulary",
    "Grammar",
    "Reading",
    "Listening",
    "Academic writing",
    "Medical English",
  ],
  Research: [
    "PICO",
    "Literature review",
    "Critical appraisal",
    "Statistik",
    "PRISMA",
  ],
};
export async function seed() {
  await seedLpdpQuestions();
  if (await get("settings", "seed-v1")) return;
  await transaction(
    ["settings", "roadmapMonths", "topics", "questions", "documents"],
    "readwrite",
    (tx) => {
      titles.forEach((title, i) => {
        const start = new Date(2026, 9 + i, 20),
          end = new Date(2026, 10 + i, 19);
        const date = (d) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        tx.objectStore("roadmapMonths").put({
          id: `month-${i + 1}`,
          month: i + 1,
          title,
          start: date(start),
          target: date(end),
          material: descriptions[i],
          status: "Belum dipelajari",
          notes: "",
          reference: "",
          priority: "Normal",
          review: "",
          checklist: [],
          seed: true,
        });
      });
      Object.entries(topicGroups).forEach(([category, topics]) =>
        topics.forEach((title, i) =>
          tx
            .objectStore("topics")
            .put({
              id: `${category}-${i}`,
              category,
              title,
              objective: `Mampu menjelaskan dan menerapkan konsep ${title}.`,
              summary:
                "SAMPLE — perlu verifikasi. " +
                (content[title]?.[0] ||
                  "Tambahkan ringkasan dari referensi yang telah Anda verifikasi."),
              reference: content[title]?.[1] || "",
              notes: "",
              status: "Belum dipelajari",
              mastery: 0,
              seed: true,
            }),
        ),
      );
      [
        "STR",
        "SIP",
        "ATLS",
        "ACLS",
        "Dokumen akademik",
        "Dokumen kedinasan",
        "Dokumen beasiswa",
        "Dokumen PPDS",
        "Persyaratan institusi",
      ].forEach((title, i) =>
        tx
          .objectStore("documents")
          .put({
            id: `doc-${i}`,
            title,
            status: "Belum diperiksa",
            checked: "",
            deadline: "",
            notes: "",
            reference: "",
          }),
      );
      const qs = [
        {
          id: "sample-1",
          category: "SIMAK UI",
          subcategory: "Numerik",
          type: "mcq",
          difficulty: "Mudah",
          prompt: "SAMPLE · Berapa 15% dari 200?",
          options: ["15", "20", "30", "45"],
          answer: "30",
          explanation: "15/100 × 200 = 30.",
        },
        {
          id: "sample-2",
          category: "BTKV",
          subcategory: "Fisiologi",
          type: "boolean",
          difficulty: "Mudah",
          prompt:
            "SAMPLE · Curah jantung = frekuensi jantung × volume sekuncup.",
          options: ["Benar", "Salah"],
          answer: "Benar",
          explanation:
            "Definisi dasar curah jantung. Verifikasi dengan buku fisiologi.",
        },
        {
          id: "sample-3",
          category: "English & TOEFL",
          subcategory: "Vocabulary",
          type: "short",
          difficulty: "Mudah",
          prompt: "SAMPLE · Bentuk lampau dari study?",
          options: [],
          answer: "studied",
          explanation: "Konsonan + y berubah menjadi -ied.",
        },
      ];
      qs.forEach((q) =>
        tx
          .objectStore("questions")
          .put({
            ...q,
            source: "Contoh demonstrasi buatan aplikasi — perlu verifikasi",
            sample: true,
          }),
      );
      tx.objectStore("settings").put({ id: "seed-v1", value: true });
    },
  );
}
