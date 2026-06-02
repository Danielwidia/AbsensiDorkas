# Dorkas Attendance System

Sistem Absensi dengan fitur Geofencing dan Face Recognition.

## Fitur
- **Absensi Geofencing**: Memastikan user berada di lokasi yang ditentukan.
- **Face Recognition**: Verifikasi wajah menggunakan face-api.js.
- **Dual Storage**: Mendukung Supabase (Cloud) dan db.json (Lokal) sebagai fallback.
- **Admin Dashboard**: Monitoring log absensi, pengaturan lokasi, dan manajemen user.

## Persiapan
1. Clone repository ini.
2. Jalankan `npm install` untuk menginstal dependencies.
3. Salin file `.env.example` menjadi `.env`.
4. Isi URL dan Anon Key Supabase di file `.env` jika ingin menggunakan database online. Jika tidak diisi, sistem akan otomatis menggunakan `db.json`.

## Cara Menjalankan
### Development (Frontend & Backend)
Jalankan perintah berikut untuk menjalankan frontend (Vite) dan backend secara bersamaan:
```bash
npm run start-all
```

### Produksi
1. Build frontend terlebih dahulu:
   ```bash
   npm run build
   ```
2. Jalankan server Node.js:
   ```bash
   npm start
   ```

## Struktur Proyek
- `server.js`: Backend API menggunakan Express.
- `src/`: Source code frontend (React + Tailwind).
- `public/`: Asset publik dan model face-api.js.
- `db.json`: Database lokal (diabaikan oleh git).
