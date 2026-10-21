# Hasil verifikasi

Lingkungan: Node.js 24.19.0, npm 11.9.0, Chromium sistem 154, Playwright, Linux. Pengujian berjalan terhadap output produksi Vite di `dist`, bukan dev server.

**Run fondasi: 20 Oktober 2026 — 11 pengujian lulus, 0 gagal, 0 dilewati (24,1 detik).** Dashboard dev server juga merespons HTTP 200 dan dirender di Chromium tanpa exception JavaScript.

- Instalasi dependencies berhasil: `npm install --cache /tmp/sobri-npm` dan pemasangan ulang frozen lockfile `npm ci --cache /tmp/sobri-npm`.
- Build produksi `npm run build` berhasil.
- Suite browser mencakup:
  1. Dashboard tanpa progres fiktif, checklist persisten setelah reload, roadmap dapat diedit tanpa seed duplikat.
  2. Timer start/pause/resume, pemulihan setelah reload, pencatatan aktual parsial 2 detik dengan konfirmasi.
  3. Jawaban dan error log persisten, review error, interval flashcard, export dan replace backup.
  4. Cache production, reload offline, penambahan catatan/jawaban/sesi saat offline, tidak ada request runtime eksternal.
  5. Semua halaman navigasi, viewport desktop dan mobile tanpa overflow horizontal atau exception JavaScript.
  6. Simulasi clock empat sesi 10/50/45/15 menit: 7200 detik aktual, empat sesi selesai, tidak selesai otomatis sebelum konfirmasi.
  7. Mini-tryout berbatas waktu pulih setelah reload; hasil 5/5 jawaban tersimpan (dengan bank soal tambahan).
  8. Dokumen, proyek riset, revisi catatan/esai dan skor English tersimpan setelah reload.
  9. Backup dengan record rusak ditolak sebelum mengubah data lokal.
  10. Update shell gagal dengan respons 503 tidak menyimpan respons error; update berikutnya berhasil, cache lama dibersihkan dan IndexedDB tetap utuh.
  11. Draft esai/catatan yang belum difinalisasi dipulihkan setelah reload.

Lihat hasil terminal `npm test` untuk run terbaru. Pengujian tidak mencakup menunggu sesi dua jam nyata, perangkat fisik, Safari/iOS, atau instalasi/deployment Vercel langsung.


## Integrasi bank LPDP — 21 Oktober 2026

- `npm run test:data`: **32 pemeriksaan lulus**, 0 gagal. Memeriksa 30 jawaban terhadap audit isi yang terpisah dari huruf kunci sumber, kalkulasi numerik, solusi unik kendala urutan/tempat duduk, lima opsi unik, kategori, pembahasan, kesulitan, estimasi waktu, dan ID unik. Pemeriksaan internal ini bukan validasi resmi oleh LPDP.
- `npm run build`: **berhasil**. JSON paket di-bundle lokal ke aset produksi; tidak menambah request API/backend/CDN.
- `npm test`: **16 tes browser lulus**, 0 gagal, 0 dilewati (41,8 detik). Termasuk regresi aplikasi dan lima tes LPDP berikut:
  1. Practice Mode benar-benar mengirim jawaban untuk seluruh 30 soal melalui UI; skor akhir 100/100 dan 30 record jawaban unik tersimpan. Reload setelah soal pertama mempertahankan pembahasan dan mencegah pengiriman ganda.
  2. Timed Practice mengerjakan seluruh 30 soal dengan hasil dan persistensi yang sama; deadline dan sesi pulih setelah reload.
  3. Filter kategori/kesulitan, jawaban salah dan benar saat offline, review soal terakhir yang salah, lalu koreksi yang mengeluarkannya dari antrean review.
  4. Seed berjalan pada database dengan marker lama, mengisi ID yang hilang tanpa menduplikasi atau menimpa edit/bookmark/catatan. Seluruh 30 record mempertahankan field JSON asli. Backup/merge mempertahankan bank beserta metadata dan menerima sesi/hasil LPDP yang telah selesai.
  5. Clock virtual melewati deadline: sesi berakhir, satu jawaban tetap tersimpan, dan 29 soal belum dijawab tidak menghasilkan attempt fiktif.

Test regresi kini mengharapkan 33 soal total: 3 contoh lintas modul dan 30 latihan LPDP. Tes mini-tryout umum tetap mengerjakan lima soal. Tes data Node dipisah dari Playwright melalui `testMatch` agar runner tidak mencampur hasil. Materi LPDP adalah latihan orisinal, bukan salinan atau soal resmi seleksi.
