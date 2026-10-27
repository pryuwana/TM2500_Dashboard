# TM2500 GM View — Dashboard (Vercel)

Dashboard 1 halaman untuk GM — Relokasi TM2500 2×25 MW (PLN Balai Pungut → DGT Duri), mengikuti **PHR Design System**.

**Isi tampilan**
- Progres fisik (S-Curve): aktual vs rencana, deviasi, kurva mingguan, progres per area kerja.
- Milestone utama: contract signing, mobilisasi unit, konstruksi PHR selesai, start-up, reliability run.
- Aktivitas lapangan 2 minggu ke depan (dari S-Curve): In Progress, Late, Behind schedule.
- Isu & tindak lanjut serta Ask for Help (dari tracker kegiatan).

**Sumber data**
| Bagian | Sumber |
|---|---|
| Progres fisik, area kerja, aktivitas, milestone | File S-Curve proyek (sheet S-Curve: baris Plan / Cum Plan / Actual / Cum Actual; milestone = aktivitas durasi 0) |
| Isu, update lapangan, PIC, Ask for Help | Tracker Action Item TM2500 |

## Isi folder
| File | Fungsi |
|---|---|
| `index.html`, `styles.css`, `app.js` | Dashboard (HTML/JS murni, tanpa build step) |
| `data.json` | Data per 23 Okt 2026 (S-Curve Rev 23 Okt + tracker) |
| `assets/phr-horizontal-color.png` | Logo resmi PHR (PHR Design System) |
| `assets/tm2500-unit.jpg` | Foto aktual unit TM2500 di PLN Balai Pungut (ganti dengan nama file sama) |
| `assets/pgt-logo.png` | Logo tim PGT |
| `bg.js` | Animasi background dot matrix (statis bila *reduce motion* aktif) |
| `fonts/plus-jakarta-sans-latin.woff2` | Font PHR Design System |
| `vendor/xlsx.full.min.js`, `vendor/lucide.min.js` | Pembaca Excel (SheetJS 0.18.5) & ikon Lucide 0.454.0 |
| `vercel.json` | Header `noindex` & `no-store` untuk data.json |

## Deploy pertama
1. Upload isi folder `tm2500-dashboard` ke repo GitHub (private).
2. https://vercel.com → **Add New… → Project** → **Import** repo. Framework Preset: **Other**, tanpa build command → **Deploy**.
   (Alternatif CLI: `npm i -g vercel` → `cd tm2500-dashboard` → `vercel --prod`.)

## Update mingguan (khusus admin)
1. Buka dashboard dengan **`#admin`** di akhir URL, misalnya `https://nama-proyek.vercel.app/#admin`.
   Tombol admin hanya muncul di mode ini; tampilan GM tetap bersih.
2. Klik **Muat S-Curve** → pilih file S-Curve terbaru (actual minggu terakhir sudah diisi).
3. Klik **Muat tracker** → pilih tracker terbaru (ganti Tanggal Status di sel C2 sebelumnya).
4. Periksa tampilan, lalu klik **Unduh data** → timpa `data.json` di repo → push (Vercel deploy ulang otomatis).
   File Excel hanya diproses di browser, tidak di-upload ke server.

## Catatan untuk admin
- Item tracker tampil sebagai **isu** bila lewat target atau diberi Risiko Manual.
- **Ask for Help** bila kolom Next Step diawali `AFH:`, menyebut "ask for help", atau meminta *approval / persetujuan / izin*.
- **Highlight kritikal** diatur di `data.json` bagian `"highlights"`: `level` (Kritikal / Perlu keputusan), `title`, `target` (1 baris), `refs` = nomor item tracker.
  Tampil sebagai list ringkas (judul + target + status At Risk/Late).
  Status di list highlight otomatis mengikuti tracker; highlight hilang sendiri bila semua item refs sudah Done.
  Bagian ini tetap terbawa saat admin klik **Unduh data**.
- Catatan administratif di kolom update (mis. "Item baru dari S-Curve…") tidak ditampilkan.
- Status proyek: **On Track** bila aktual ≥ rencana dan tidak ada isu Late; **Waspada** bila deviasi negatif s.d. −5% atau ada isu Late; **Perlu perhatian** bila deviasi < −5%.

## Keamanan data
Seluruh dashboard (termasuk `data.json`) dilindungi password oleh `middleware.js` (HTTP Basic Auth, dicek di server Vercel).
- Username & password: Vercel → Project Settings → **Environment Variables** → `DASH_USER`, `DASH_PASS`.
- Ganti password: edit `DASH_PASS` → **Deployments → Redeploy** deployment terakhir.
- Bila env kosong, semua akses ditolak.
`noindex` tetap aktif agar tidak muncul di mesin pencari.
