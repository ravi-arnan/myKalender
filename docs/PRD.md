# myKalender - Product Requirements Document

**Status:** Draft v1.0
**Author:** Ravi Arnan
**Last Updated:** 2026-05-17

---

## 1. Overview

myKalender adalah aplikasi web kalender terpadu yang menggabungkan jadwal dari beberapa akun Google Calendar ke dalam satu tampilan. Aplikasi ini juga memiliki fitur AI yang dapat membuat dan menjadwalkan event secara otomatis berdasarkan deskripsi natural language dari pengguna.

### Problem Statement

Banyak orang memiliki beberapa akun Google (personal, kerja, kampus) dengan kalender terpisah. Berpindah-pindah akun untuk mengecek jadwal itu repot, dan menjadwalkan event manual satu per satu juga memakan waktu.

### Solution

Satu dashboard untuk melihat semua kalender, ditambah AI assistant yang bisa parse deskripsi jadwal dalam bahasa natural dan langsung membuat event di akun Google Calendar yang dipilih.

---

## 2. Goals & Non-Goals

### Goals

- Menampilkan event dari multiple akun Google Calendar dalam satu unified view
- AI dapat membuat event otomatis dari prompt natural language
- Color-coding per akun untuk diferensiasi visual
- Filter show/hide per akun
- Conflict detection antar akun
- Sepenuhnya cost-free (semua layer pakai free tier)

### Non-Goals (v1)

- Tidak mendukung kalender non-Google (Outlook, Apple Calendar) di v1
- Tidak ada fitur kolaborasi/sharing antar pengguna
- Tidak ada native mobile app (web responsive saja)
- Tidak menangani video conferencing integration

---

## 3. Target Users

- Mahasiswa dengan akun kampus + personal
- Profesional dengan akun kerja + personal
- Freelancer dengan multiple client accounts
- Siapapun yang punya lebih dari satu akun Google

---

## 4. Key Features

### Phase 1: Foundation (Week 1)

**F1. Authentication**
- Login via Google OAuth (akun utama)
- Session management via Supabase Auth

**F2. Multi-Account Connection**
- User dapat menghubungkan akun Google tambahan
- Setiap akun tambahan disimpan dengan refresh token tersendiri
- UI untuk add/remove connected accounts
- Setiap akun memiliki label custom (misal "Kampus", "Kerja", "Personal")
- Color picker untuk warna kalender per akun

### Phase 2: Calendar View (Week 1-2)

**F3. Unified Calendar View**
- Tampilan week dan month
- Event dari semua akun ditampilkan dengan color-coding
- Klik event untuk lihat detail (title, time, location, description, akun asal)
- Toggle visibility per akun (checkbox di sidebar)

**F4. Event Management**
- Create event manual di akun manapun
- Edit event (hanya event yang dibuat dari aplikasi)
- Delete event dengan konfirmasi

**F5. Smart Insights**
- Conflict detection (overlap antar akun ditandai)
- Free time finder (cari slot kosong di semua akun)

### Phase 3: AI Scheduling (Week 2)

**F6. AI Schedule Generator**
- Textarea untuk input deskripsi natural language
- Tombol "Generate Schedule"
- LLM parse input ke structured JSON events
- Preview cards menampilkan parsed events
- User pilih target akun untuk setiap event
- Tombol "Add to Calendar" untuk insert batch ke Google Calendar

**Contoh input AI:**
```
Senin sampai Jumat saya kuliah Kalkulus jam 8-10 pagi.
Selasa dan Kamis gym jam 5 sore selama 1 jam.
Deadline tugas Fisika tanggal 20 Mei jam 23:59.
Meeting BEM tiap Sabtu jam 10 pagi.
```

**Expected output:**
```json
[
  {
    "title": "Kuliah Kalkulus",
    "start": "2026-05-18T08:00:00+07:00",
    "end": "2026-05-18T10:00:00+07:00",
    "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]
  },
  ...
]
```

---

## 5. Technical Architecture

### Stack

| Layer | Technology | Tier |
|-------|-----------|------|
| Frontend | Next.js 16 (App Router) + Tailwind v4 | Vercel free |
| Backend | Next.js API Routes / Server Actions | Vercel free |
| Database | Turso (libSQL / SQLite) | Free tier (9GB, 1B reads/month) |
| ORM | Drizzle ORM | Open source |
| Auth | Auth.js v5 (NextAuth) with Google provider | Open source |
| Encryption | Node.js `crypto` (AES-256-GCM) | Built-in |
| LLM | GitHub Models API | Free with rate limit |
| Calendar | Google Calendar API v3 | Free (1M req/day) |
| Map (optional) | Leaflet + OpenStreetMap | Free, no API key |

### GitHub Models Setup

- Endpoint: `https://models.github.ai/inference`
- Auth: GitHub PAT dengan scope `models:read`
- Model default: `openai/gpt-4o-mini`
- SDK: `openai` (OpenAI-compatible)
- Structured output via `response_format: { type: "json_schema" }`

### Token Management Strategy

- Access tokens (1 jam expiry) di-cache di Turso (`token_cache` table) atau memory
- Refresh tokens disimpan encrypted di Turso pakai AES-256-GCM (key dari `ENCRYPTION_KEY` env)
- Auto-refresh helper function sebelum tiap Google API call
- Fallback ke re-auth flow jika refresh token invalid

### Auth Strategy (Auth.js v5)

- **Primary login:** Auth.js Google provider → membuat user di `users` table via Drizzle adapter
- **Multi-account:** Akun Google tambahan TIDAK di-link via Auth.js account-linking. Pakai OAuth flow terpisah dengan endpoint custom (`/api/connect-account`) yang menyimpan tokens ke tabel `connected_accounts`
- **Session:** Database session (bukan JWT) untuk bisa revoke per device kalau perlu

---

## 6. Data Model

> Schema untuk Turso (libSQL / SQLite). UUID via `crypto.randomUUID()` disimpan sebagai TEXT. Timestamps pakai INTEGER unix-ms. JSON pakai TEXT dengan `JSON.stringify`.

### `users` (managed by Auth.js Drizzle adapter)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK, uuid |
| email | TEXT | Unique |
| name | TEXT | From Google |
| image | TEXT | Avatar URL |
| email_verified | INTEGER | Unix ms |

> Tabel `accounts` dan `sessions` standar Auth.js juga akan dibuat, dipakai untuk login utama saja.

### `connected_accounts`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK, uuid |
| user_id | TEXT | FK to users.id |
| google_email | TEXT | Email akun Google |
| label | TEXT | Custom label (mis. "Kampus") |
| color | TEXT | Hex color (default dari palette badge) |
| refresh_token_encrypted | TEXT | AES-256-GCM ciphertext |
| refresh_token_iv | TEXT | IV untuk decrypt |
| access_token_cache | TEXT | Encrypted access token |
| access_token_expires_at | INTEGER | Unix ms |
| created_at | INTEGER | Unix ms |

### `synced_events` (cache)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK, uuid |
| account_id | TEXT | FK to connected_accounts.id |
| google_event_id | TEXT | ID dari Google Calendar |
| title | TEXT | |
| start_time | INTEGER | Unix ms |
| end_time | INTEGER | Unix ms |
| raw_payload | TEXT | JSON string of full event |
| synced_at | INTEGER | Unix ms |

Indexes: `(account_id, start_time)` untuk query range cepat.

### `ai_generations` (audit log)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK, uuid |
| user_id | TEXT | FK to users.id |
| prompt | TEXT | Input user |
| parsed_events | TEXT | JSON string of output LLM |
| accepted_count | INTEGER | Berapa event yang akhirnya di-insert |
| created_at | INTEGER | Unix ms |

---

## 7. User Flows

### Flow A: First-time setup
1. Landing page dengan tombol "Sign in with Google"
2. OAuth flow, redirect ke dashboard
3. Onboarding: "Tambah akun Google lain?" (optional)
4. Dashboard menampilkan kalender minggu ini dari akun utama

### Flow B: Add additional account
1. Settings > Connected Accounts > Add Account
2. Trigger OAuth popup dengan `prompt=consent` (penting untuk dapat refresh_token)
3. Simpan token ke Supabase
4. User set label + color
5. Auto-fetch events dari akun baru

### Flow C: AI scheduling
1. Klik tombol "AI Schedule" di header
2. Modal dengan textarea + dropdown target akun
3. User ketik prompt, klik Generate
4. Loading state (max 10 detik)
5. Preview cards muncul, user bisa edit per event
6. Klik "Add All" untuk batch insert
7. Toast success + refresh calendar view

---

## 8. Constraints & Considerations

### Rate Limits
- **GitHub Models:** ~50 requests/hari (free tier). Mitigasi: cache prompt-result, batch events
- **Google Calendar API:** 1M req/day, cukup luas. Mitigasi: cache events di Supabase, refresh tiap 5 menit

### Security
- Refresh tokens di-encrypt pakai AES-256-GCM (Node.js `crypto`) sebelum disimpan ke Turso. Key disimpan di Vercel env (`ENCRYPTION_KEY`, 32 byte base64)
- Tidak ada RLS native di Turso/SQLite, jadi semua query DB harus selalu filter `WHERE user_id = ?` di Drizzle layer (tanggung jawab di app code)
- GitHub token disimpan di Vercel env vars, tidak pernah expose ke client
- All Google API calls dari server-side only (Next.js Server Actions atau Route Handlers)

### Privacy
- Tidak menyimpan content email/dokumen, hanya calendar events
- User bisa disconnect akun + auto-delete data terkait
- AI prompts tidak disimpan permanent (opt-in untuk audit log)

### Timezone
- Default: Asia/Jakarta (WIB)
- User bisa override di settings
- AI prompt selalu di-inject `current_date` dan `timezone` di system message

---

## 9. Success Metrics

- User bisa connect minimal 2 akun Google dalam < 2 menit
- AI parsing accuracy > 90% untuk prompt dalam bahasa Indonesia
- Calendar load time < 1 detik (dengan cache)
- Zero biaya operasional di 1000 MAU pertama

---

## 10. Timeline

| Week | Milestone |
|------|-----------|
| 1 | Phase 1 + setup project, Supabase, Google OAuth |
| 1-2 | Phase 2: Calendar view + multi-account |
| 2 | Phase 3: AI integration dengan GitHub Models |
| 3 | Polish, deploy ke Vercel, dogfooding |

Total estimasi: 2-3 minggu untuk MVP fungsional.

---

## 11. Open Questions

- Apakah perlu offline mode (PWA + IndexedDB cache)?
- Strategi sync: polling atau Google Calendar push notifications (webhook)?
- Apakah AI generation bisa juga edit/delete existing events, atau create-only di v1?
- Apakah perlu support recurring event yang kompleks (BYMONTH, BYSETPOS) di v1, atau cukup BYDAY saja?
