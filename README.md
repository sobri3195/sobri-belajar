# Sobri's Study Roadmap

Personal learning management system untuk PPDS BTKV UI dan LPDP 2028. Vite + JavaScript ES Modules + IndexedDB + PWA. Output berupa static frontend; tidak ada backend, akun, API wajib, database eksternal, CDN, font remote, analytics, atau pengiriman data belajar ke server.

**Roadmap pribadi 20 Oktober 2026 – 19 Oktober 2027 bukan kalender resmi UI/LPDP.** Ringkasan dan tiga soal awal berlabel SAMPLE / perlu verifikasi. Target TOEFL internal bukan persyaratan resmi. Materi awal berupa ringkasan belajar singkat, bukan buku ajar lengkap atau panduan keputusan klinis.

## Instalasi dan development

Gunakan Node.js >=22.12 (divalidasi di Node 24.19.0) dan npm.

```sh
npm ci
npm run dev
```

Di cloud ini, cache bawaan npm tidak dapat ditulis. Gunakan `npm ci --cache /tmp/sobri-npm`. Dependencies hanya diperlukan saat development/build. Aplikasi production tidak menjalankan Node.js.

```sh
npm run build
npm run preview
```

Vite menulis hasil build ke `dist`. Pengujian offline harus menggunakan build production/preview, bukan dev server. Jangan membuka `index.html` menggunakan `file://`; IndexedDB, ES Modules dan service worker memerlukan origin yang sesuai, yaitu HTTPS atau localhost saat development.

## Alur penggunaan

1. Buka **Planner Harian**, pilih tanggal, dan buat checklist dari jadwal. Jadwal Senin–Sabtu terdiri dari 10 + 50 + 45 + 15 menit. Minggu adalah istirahat terjadwal; review ringan boleh ditambahkan manual. Jadwal dan hari istirahat dapat diubah di Data & Pengaturan.
2. Mulai sesi, pause/resume sesuai kebutuhan. Timer menggunakan timestamp dan akumulasi waktu, sehingga reload tidak mereset sesi. Waktu saat browser ditinggalkan diperkirakan sampai batas durasi rencana. Saat mengakhiri, konfirmasikan atau koreksi durasi aktual dalam detik. Waktu habis **tidak** otomatis membuat sesi selesai. Reset mengakhiri sesi dengan status `ended`, bukan `completed`.
3. Checklist dapat diedit, ditunda satu hari, dihapus, dan diselesaikan. Perubahan langsung disimpan; membuat jadwal lagi tidak menduplikasi tugas tanggal yang sama.
4. Edit tanggal, materi, status, checklist, prioritas, referensi, catatan, dan jadwal review pada roadmap. Checklist memakai format satu baris per item: `[ ] belum` atau `[x] selesai`.
5. Buka keenam modul belajar. Edit tujuan, ringkasan, referensi, catatan, status aktivitas, dan hasil recall pribadi 0–5. Tambahkan flashcard/soal terkait melalui ruang materi.
6. Bank Soal mendukung pilihan ganda, boolean, dan jawaban singkat. Jawaban singkat dicocokkan tanpa membedakan huruf besar/kecil dan spasi tepi; tidak memakai AI penilai. Tambahkan soal sendiri, tandai soal, filter, acak, atau mulai mini-tryout maksimal lima soal dengan batas waktu. Jawaban dan durasi aktual tersimpan; tryout dapat dipulihkan setelah reload. Soal belum dijawab saat waktu habis tidak dianggap benar.
7. Jawaban salah membuat error log otomatis. Lengkapi penyebab kesalahan, koreksi, dan jadwal review. Review Kesalahan Hari Ini membentuk antrean dari error yang jatuh tempo; bila tidak ada soal tertaut, membuka review manual atau materi yang jatuh tempo.
8. Flashcards memakai interval sederhana: ulangi 1 hari; sulit sekitar 1,2× interval; ingat minimal 3 hari atau 2× interval. Setiap penilaian tersimpan. Ini algoritme sederhana, bukan SM-2/FSRS.
9. LPDP menyediakan draft esai/catatan wawancara dan revisi. Draft catatan/esai yang belum disimpan dicadangkan otomatis di IndexedDB setelah jeda pengetikan. Simpan untuk menjadikannya catatan final. Research menyediakan PICO, literature review, appraisal, statistik, PRISMA, referensi, deadline, dan status publikasi. Administrasi mencatat pemeriksaan dan kelengkapan dokumen.
10. English menyediakan target TOEFL pribadi, pencatatan skor latihan, catatan dan flashcards, serta audio lokal. Audio tidak diunggah dan harus dipilih kembali setelah reload; file asli tetap di perangkat dan tidak masuk backup JSON.
11. Progres memisahkan aktivitas (durasi, sesi, tugas dan roadmap) dari penguasaan (akurasi, recall dan review). Streak menghitung hari dengan waktu aktual >0 dan melewati hari istirahat terjadwal. Belum ada data berarti nol atau empty state, bukan skor fiktif.

## Offline dan instalasi PWA

Buka production lewat HTTPS sekali saat online. Tunggu **Data & Pengaturan → Offline & pembaruan** menunjukkan shell tersimpan. Pada browser yang mendukung, gunakan menu **Install app / Add to Home Screen**. Di iOS, gunakan Safari → Share → Add to Home Screen. Ketersediaan menu instalasi ditentukan browser/perangkat.

Service worker dihasilkan saat build dengan daftar aset ber-hash. HTML, CSS, JavaScript, manifest dan ikon lokal disimpan; navigasi memiliki fallback HTML lokal. Hanya respons sukses yang boleh dicache. Pembaruan diinstal di cache versi baru; cache lama dihapus setelah aktivasi. Tombol versi baru meminta aktivasi lalu reload. IndexedDB terpisah dari cache dan tidak dihapus oleh pembaruan aplikasi.

Setelah cache awal siap, matikan jaringan dan reload. Materi lokal, checklist, timer, soal, catatan, backup, dan statistik tetap tersedia. Kunjungan pertama tanpa koneksi tidak didukung. Status online/offline mengikuti status koneksi browser, bukan jaminan akses internet. File statis tetap diminta ke host pada akses online; isi data belajar tidak disertakan pada URL maupun request.

## Backup dan restore

Di **Data & Pengaturan**:

- **Export seluruh data** menghasilkan JSON dengan identitas aplikasi, versi schema, tanggal export dan seluruh object store. Preferensi tema ringan di localStorage dan file audio asli tidak termasuk. Timer aktif dibackup sebagai paused sehingga waktu sejak export tidak ditambahkan setelah restore.
- Pilih backup untuk menampilkan jumlah record setiap store. Struktur, ID duplikat, tipe dan field inti divalidasi sebelum penulisan.
- **Merge** mempertahankan record lokal lain; ID yang sama ditimpa oleh backup.
- **Replace** mengganti seluruh record dalam satu transaksi IndexedDB setelah konfirmasi. Kegagalan transaksi membatalkan seluruh perubahan.
- Batas import backup di UI 25 MB. Backup sebelum pindah perangkat, berganti domain/browser, atau menghapus data situs. File backup mengandung data pribadi dan tidak dienkripsi oleh aplikasi; simpan di lokasi yang Anda percayai.

Tidak ada sinkronisasi otomatis. Untuk pindah perangkat, export dari perangkat lama dan import pada perangkat baru. Data tiap browser/profile/origin berdiri sendiri. Mode private, penghapusan data browser, kuota, dan kebijakan eviction browser dapat menghilangkan data. Tombol penyimpanan persisten meminta perlindungan tambahan bila browser mengizinkan; backup tetap diperlukan.

## Arsitektur dan inspeksi data

- `src/pages/`: renderer halaman terpisah, termasuk renderer bersama untuk modul materi.
- `src/app.js`: navigasi hash, controller interaksi dan koordinasi state.
- `src/db/indexeddb.js`: API `all/get/put/remove/transaction`; commit dan error penulisan ditunggu.
- `src/db/migrations.js`: schema versi 1. Migrasi awal membuat store yang belum ada. Perubahan schema berikutnya harus menambah versi dan cabang migrasi, tanpa menghapus store berisi data.
- `src/data/`: roadmap, jadwal, contoh soal dan ringkasan SAMPLE. Marker `seed-v1` mencegah seed berulang dan tidak menimpa hasil pengguna.
- `src/services/`: timer dan backup/restore.
- `src/styles/`: token warna, komponen, responsive layout, dark theme.
- `vite.config.js`: pembentukan app shell service worker; `public/`: manifest dan ikon lokal.

DevTools → Application/Storage → IndexedDB → **sobri-study**. Store: `settings`, `roadmapMonths`, `topics`, `studyTasks`, `studySessions`, `questions`, `attempts`, `flashcards`, `errorLogs`, `notes`, `weeklyReviews`, `monthlyReviews`, `researchProjects`, `documents`. Record pengguna memiliki ID unik dan timestamp. Settings juga menyimpan timer/tryout aktif, hasil tryout, skor English, konfigurasi jadwal dan draft. localStorage hanya menyimpan tema.

Penggunaan dianjurkan dalam satu tab ketika merekam sesi. Tidak ada koordinasi kolaboratif antarperangkat. Jam sistem yang diubah dapat memengaruhi timer dan jadwal. Durasi sesi dialokasikan pada tanggal berakhirnya sesi; sesi melewati tengah malam belum dipecah per hari.

## Deploy Vercel Static Hosting

Konfigurasi `vercel.json` sudah disediakan. Tidak ada serverless function atau secret environment variable.

1. Commit/push source ke repository Git milik Anda.
2. Masuk Vercel, **Add New → Project**, lalu import repository `sobri3195/sobri-belajar`.
3. Pilih framework **Vite**, project root repository ini, Node 22.x atau 24.x, build command **npm run build**, output directory **dist**.
4. Deploy dan buka domain HTTPS yang diberikan Vercel.
5. Tunggu cache awal, uji install, aktifkan offline di DevTools, reload, lalu tambah tugas/jawaban.

Routing memakai hash (`/#roadmap`), sehingga tidak membutuhkan rewrite SPA. Service worker memiliki scope `/`, manifest memakai `/manifest.webmanifest`, dan build ditujukan pada root domain, bukan subpath. `sw.js` diberi header `no-cache`; header keamanan membatasi koneksi runtime ke origin sendiri.

**Status saat penyerahan:** build static berhasil dan diuji lokal; belum dipublikasikan ke Vercel. Tidak ada akun/project/token Vercel yang dikonfigurasi di environment ini. Publikasi snapshot cloud environment berbeda dari deployment Vercel.

## Pengujian

```sh
npm ci
npx playwright install chromium
npm run build
npm test
```

Jika sistem telah memiliki `/usr/bin/chromium`, konfigurasi otomatis menggunakannya. Untuk lokasi lain gunakan `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm test`. Perintah instalasi browser tidak diperlukan di cloud ini karena Chromium sistem tersedia. Browser hanya dependency pengujian, bukan runtime aplikasi.

Pengujian dijalankan pada build produksi dengan Playwright + Chromium, satu worker. Empat sesi 10/50/45/15 menit diuji menggunakan clock virtual, bukan menunggu dua jam nyata. Detail hasil terakhir ada di `TESTING.md`.

Pengujian desktop/mobile menggunakan viewport browser, bukan perangkat fisik. Instalasi OS PWA, Safari/iOS dan domain Vercel production perlu dicek pada perangkat tujuan setelah deployment. Belum ada verifikasi klinis/akademik eksternal atas materi SAMPLE.
