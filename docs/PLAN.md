# myKalender - Implementation Plan

> Step-by-step implementation plan untuk MVP. Mengacu ke [PRD](./PRD.md) dan [DESIGN](../DESIGN.md). Estimasi total 2-3 minggu.

---

## Phase 0: Project Setup

**Goal:** Scaffold project + semua external services siap.

### 0.1 Local Scaffold
- [ ] `npx create-next-app@latest myKalender` (Next.js 16, App Router, Tailwind v4, TypeScript, Turbopack)
- [ ] Install core deps: `drizzle-orm`, `@libsql/client`, `next-auth@beta`, `@auth/drizzle-adapter`
- [ ] Install dev deps: `drizzle-kit`, `@types/node`
- [ ] Install icons: `lucide-react`
- [ ] Setup `.env.example` dengan semua var yang dibutuhkan
- [ ] Setup `.gitignore` untuk `.env*.local`, `node_modules`, `.next`

### 0.2 Turso Setup
- [ ] Install Turso CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
- [ ] `turso auth signup` / `turso auth login`
- [ ] `turso db create mykalender --location sin` (Singapore)
- [ ] Catat: `TURSO_DATABASE_URL` (dari `turso db show mykalender`) dan `TURSO_AUTH_TOKEN` (dari `turso db tokens create mykalender`)
- [ ] Tambahkan ke `.env.local`

### 0.3 Google Cloud OAuth
- [ ] Buat project di Google Cloud Console
- [ ] Enable Google Calendar API
- [ ] Create OAuth 2.0 Client ID (Web application)
- [ ] Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google` (Auth.js)
  - `http://localhost:3000/api/connect-account/callback` (custom multi-account flow)
- [ ] Catat `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET`
- [ ] Generate `AUTH_SECRET`: `openssl rand -base64 32`

### 0.4 GitHub Models Token
- [ ] Buat PAT di github.com/settings/tokens dengan scope `models:read`
- [ ] Catat sebagai `GITHUB_MODELS_TOKEN`

### 0.5 Encryption Key
- [ ] Generate `ENCRYPTION_KEY`: `openssl rand -base64 32`
- [ ] Save ke `.env.local` (32 byte base64 untuk AES-256-GCM)

---

## Phase 1: Design System & Foundation

**Goal:** Token design system implemented, Auth.js working, user bisa login.

### 1.1 Tailwind v4 Theme
- [ ] Copy color tokens dari `DESIGN.md` ke `app/globals.css` `@theme` block
- [ ] Setup typography tokens (Inter weight 600 with negative letter-spacing for display)
- [ ] Add font import (Inter via `next/font/google`)
- [ ] Test dengan dummy page

### 1.2 Drizzle Schema
- [ ] Create `db/schema.ts` dengan:
  - `users` (Auth.js managed)
  - `accounts` (Auth.js managed, untuk OAuth login utama)
  - `sessions` (Auth.js managed)
  - `verificationTokens` (Auth.js managed)
  - `connected_accounts` (custom)
  - `synced_events` (custom)
  - `ai_generations` (custom)
- [ ] Create `db/index.ts` dengan Drizzle client connected ke Turso
- [ ] Setup `drizzle.config.ts`
- [ ] Run `npx drizzle-kit generate` + `npx drizzle-kit migrate`

### 1.3 Auth.js Configuration
- [ ] Create `auth.ts` di root dengan Google provider + Drizzle adapter
- [ ] Scope: `openid email profile https://www.googleapis.com/auth/calendar`
- [ ] Konfigurasi `prompt: "consent"` + `access_type: "offline"` untuk dapat refresh token
- [ ] Session strategy: `database`
- [ ] Create `app/api/auth/[...nextauth]/route.ts`
- [ ] Create `middleware.ts` untuk protect routes (`/dashboard`, `/settings`)

### 1.4 Sign-in Page
- [ ] Translate `sign_in_screen_desktop_updated` ke React component
- [ ] Button "Sign in with Google" pakai `signIn("google")` dari `next-auth/react`
- [ ] Responsive mobile version

### 1.5 Empty State (No Accounts)
- [ ] Translate `empty_state_no_accounts_desktop` ke React component
- [ ] Tampil di `/dashboard` kalau user belum punya entry di `connected_accounts`
- [ ] CTA "Tambah Akun" trigger Phase 2 flow

---

## Phase 2: Multi-Account OAuth

**Goal:** User bisa connect akun Google tambahan dan kelola di Settings.

### 2.1 Encryption Helper
- [ ] Create `lib/crypto.ts` dengan `encrypt(plaintext)` dan `decrypt(ciphertext, iv)`
- [ ] Pakai `crypto.createCipheriv("aes-256-gcm", key, iv)`
- [ ] Unit test dengan beberapa input

### 2.2 Connect Account Flow
- [ ] Create `app/api/connect-account/route.ts`, redirect ke Google OAuth dengan scope calendar
- [ ] Create `app/api/connect-account/callback/route.ts`:
  - Exchange code untuk tokens
  - Encrypt `refresh_token`
  - Insert ke `connected_accounts` (default color dari badge palette berikutnya)
  - Redirect ke `/settings/accounts`
- [ ] Handle error cases (user denial, invalid grant)

### 2.3 Token Refresh Helper
- [ ] Create `lib/google-auth.ts` dengan `getValidAccessToken(accountId)`
- [ ] Cek `access_token_expires_at`, kalau expired refresh pakai Google token endpoint
- [ ] Update cache di `connected_accounts`

### 2.4 Settings Page
- [ ] Translate `settings_connected_accounts_desktop` + mobile version
- [ ] List akun dari `connected_accounts` (filter `user_id`)
- [ ] Edit label inline
- [ ] Color picker (4 pastel default + custom hex)
- [ ] Disconnect button (delete row + clear cache events)

---

## Phase 3: Calendar Fetch & Sync

**Goal:** Events dari Google Calendar tersinkron ke Turso.

### 3.1 Google Calendar Client
- [ ] Create `lib/google-calendar.ts` dengan helper `listEvents(accountId, timeMin, timeMax)`
- [ ] Pakai `getValidAccessToken` untuk auth
- [ ] Handle pagination (`nextPageToken`)
- [ ] Error handling: 401 re-refresh token, 403/429 exponential backoff

### 3.2 Sync Strategy
- [ ] Create `lib/sync.ts` dengan `syncAccountEvents(accountId, range)`
- [ ] Strategi: pull events untuk range (default kurang lebih 30 hari dari today)
- [ ] Upsert ke `synced_events` (pakai `INSERT ... ON CONFLICT(google_event_id) DO UPDATE`)
- [ ] Trigger sync di:
  - Setelah connect account baru
  - On dashboard load (kalau cache stale lebih dari 5 menit)
  - Manual refresh button

### 3.3 Server Actions
- [ ] `getEvents(userId, range)`, query `synced_events` JOIN `connected_accounts` filter by user
- [ ] `refreshEvents(userId)`, trigger sync untuk semua akun user

---

## Phase 4: Calendar Views

**Goal:** Unified calendar terlihat di dashboard, mobile + desktop.

### 4.1 Layout Shell
- [ ] Top nav (logo + view switcher pill-group + AI Schedule button + avatar)
- [ ] Sidebar (mini calendar + account checklist + Add Account + Settings link)
- [ ] Main content area
- [ ] Mobile: hamburger + bottom sheet untuk sidebar

### 4.2 Week View
- [ ] Translate `dashboard_week_view_refined_event_blocks` ke React
- [ ] Time slots vertikal, hari horizontal
- [ ] Event blocks dengan color dari `connected_accounts.color`
- [ ] Truncate title kalau block kecil
- [ ] Click event buka detail modal

### 4.3 Month View
- [ ] Translate `dashboard_month_view_desktop`
- [ ] Mobile pakai agenda list view (`dashboard_month_view_agenda_mobile`)

### 4.4 Event Detail Modal
- [ ] Translate `event_detail_modal_desktop` + mobile bottom sheet
- [ ] Show title, time, location, description, source account, recurrence
- [ ] Skip map preview di v1
- [ ] "Open in Google Calendar" link eksternal

### 4.5 Conflict Detection
- [ ] Logic: cari overlap antar events dari akun berbeda di range visible
- [ ] Tampilkan badge `CONFLICT` di event blocks yang overlap
- [ ] Sidebar counter "N conflicts detected"
- [ ] Click conflict buka `conflict_resolution_modal_desktop` (atau skip ke v2 kalau too complex)

---

## Phase 5: AI Schedule Generation

**Goal:** AI bisa parse prompt dan bikin events di Google Calendar.

### 5.1 GitHub Models Client
- [ ] Install `openai` SDK (kompatibel dengan endpoint GitHub Models)
- [ ] Create `lib/ai.ts` dengan client config:
  - `baseURL: "https://models.github.ai/inference"`
  - `apiKey: process.env.GITHUB_MODELS_TOKEN`
- [ ] Helper `parseSchedulePrompt(prompt, context)` yang return structured events

### 5.2 Structured Output
- [ ] Define JSON schema untuk event (title, start, end, recurrence, description)
- [ ] System prompt include: current date, user timezone, available accounts
- [ ] Pakai `response_format: { type: "json_schema", json_schema: {...} }`
- [ ] Fallback parsing kalau model tidak support structured output (use prompt engineering)

### 5.3 AI Modal UI
- [ ] Translate `ai_schedule_modal_desktop` + mobile version
- [ ] Dark surface, textarea, target account selector, Generate button
- [ ] Loading state (max 10s timeout)
- [ ] Preview cards 2-up dengan editable fields
- [ ] Error state pakai `ai_parsing_failed_modal_desktop`

### 5.4 Batch Insert to Google Calendar
- [ ] Server action `createEventsInCalendar(events[], accountId)`
- [ ] Loop insert via Google Calendar API
- [ ] Update `ai_generations` audit log
- [ ] Trigger sync setelah insert untuk update local cache
- [ ] Toast success / partial-failure feedback

---

## Phase 6: Polish & Deploy

**Goal:** Production-ready, deployed, dogfooded.

### 6.1 Mobile Responsive
- [ ] Test semua screens di 375px width
- [ ] Bottom sheets untuk modal di mobile
- [ ] Touch targets 40px minimum
- [ ] Hamburger menu untuk top nav

### 6.2 Loading & Error States
- [ ] Skeleton loaders untuk calendar grid
- [ ] Empty states: no events in range, AI parse fail
- [ ] Error boundary di root
- [ ] Toast system (pakai `sonner` atau native)

### 6.3 Deploy
- [ ] Push ke GitHub
- [ ] Connect ke Vercel
- [ ] Setup production env vars
- [ ] Update Google OAuth redirect URIs untuk production domain
- [ ] Test full flow di production

### 6.4 Dogfooding
- [ ] Connect own accounts (personal + work + kampus)
- [ ] Run for 1 week
- [ ] Fix bugs yang muncul
- [ ] Catat improvement ideas untuk v2

---

## Open Decisions (perlu dijawab sebelum mulai Phase tertentu)

| Decision | Phase | Default Recommendation |
|---|---|---|
| Sync via polling atau webhook? | 3 | Polling 5 menit dulu (webhook butuh public HTTPS, lebih kompleks) |
| Conflict resolution modal di v1? | 4 | Skip, hanya tampilkan badge. Resolve manual via Google Calendar |
| Recurring event di AI generation? | 5 | Support `FREQ=WEEKLY;BYDAY=...` saja, skip BYMONTH/BYSETPOS |
| Cron job untuk auto-sync? | 6 | Vercel Cron (free tier 2 cron jobs) atau skip, sync on-demand saja |

---

## Estimasi Waktu

| Phase | Estimasi | Cumulative |
|---|---|---|
| 0. Setup | 2 jam | 2 jam |
| 1. Foundation | 1 hari | 1 hari 2 jam |
| 2. Multi-account OAuth | 1.5 hari | 2.5 hari |
| 3. Calendar Sync | 1 hari | 3.5 hari |
| 4. Calendar Views | 3 hari | 6.5 hari |
| 5. AI Schedule | 2 hari | 8.5 hari |
| 6. Polish & Deploy | 1.5 hari | 10 hari (2 minggu) |
