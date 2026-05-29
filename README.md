# myKalender

Kalender pribadi dengan **reminder yang bunyi seperti alarm beneran** — bukan notifikasi senyap. Dibikin karena Google Calendar terlalu pelan buat jadwal yang gak boleh kelewat.

**Live**: https://mykalender-cad8f.web.app

Dua app sinkron via Firestore:

- **Web** — Vite + React + TanStack Router + Tailwind v4. Buat input jadwal dari laptop, sync Google Calendar, multi-akun, dark mode, PWA installable.
- **Android** — Kotlin + Jetpack Compose + Material 3. `AlarmManager.setAlarmClock` (user-priority, nembus Doze) + full-screen alarm activity + foreground service yang loop sound dan vibrate sampai di-dismiss.

## Fitur

- Sign-in Google (akun yang sama di web + Android)
- Tambah/edit/hapus event lewat web atau Android
- Sync realtime via Firestore snapshot listener
- **Alarm beneran** di Android: nyala layar, full-screen lock screen, loop sound, bypass DND
- Pre-alarm heads-up 5 menit sebelum event
- Snooze 5 menit (re-schedule via AlarmManager)
- Custom suara alarm per-event (system ringtone picker)
- Reminder recurring (daily/weekdays/weekly/monthly) — auto-reschedule next occurrence
- Sync Google Calendar dua-arah (import + push manual)
- Multi-akun Google merge (gabung kalender beberapa akun jadi satu)
- Light/Dark/System theme picker, cross-device sync
- Week/Day/Month views di web
- Quick alarm widget (preset 5/15/30/60 menit)
- PWA: installable di HP/laptop

## Struktur

```
myKalender/
├── web/           # Vite + React app
├── android/       # Kotlin + Compose app
├── scripts/       # Node scripts (test event injection)
├── docs/          # PRD, DESIGN.md, mockup screens
├── .github/
│   └── workflows/ # CI/CD GitHub Actions
├── firebase.json  # Firestore + Hosting config
├── firestore.rules
└── ROADMAP.md
```

## Setup

### Prasyarat

- Node.js 22+, pnpm 10+
- JDK 17 (Android build — set di `android/gradle.properties`)
- Android SDK (build-tools 35+, platforms 36+)
- Firebase CLI (`npm i -g firebase-tools`)
- Firebase project sendiri (dengan Auth Google + Firestore di mode Native)

### Web

```bash
cd web
cp .env.example .env.local      # isi dengan Firebase web config kamu
pnpm install
pnpm dev                         # localhost:5173
```

### Android

1. Bikin Firebase Android app di console kamu, download `google-services.json` ke `android/app/`
2. Generate SHA-1 debug keystore, register di Firebase Auth → Sign-in method → Google
3. Build:
   ```bash
   cd android
   ./gradlew installDebug         # build + install ke device terkonek
   ```

### Firestore rules

```bash
firebase deploy --only firestore:rules
```

## Build production

### Web

```bash
cd web && pnpm build
firebase deploy --only hosting   # deploy ke Firebase Hosting
```

### Android release APK

```bash
# Generate release keystore sekali:
keytool -genkey -v -keystore /path/to/release.keystore -alias mykalender \
  -keyalg RSA -keysize 2048 -validity 25000

# Bikin android/keystore.properties dengan kredensial:
# storeFile=/absolute/path/to/release.keystore
# storePassword=xxx
# keyAlias=mykalender
# keyPassword=xxx

cd android && ./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

## Test alarm cepat

```bash
cd scripts
pnpm install
# Edit add-test-event.mjs dengan UID kamu, lalu:
node add-test-event.mjs 3 "Tes Alarm" 0   # alarm 3 menit dari sekarang
```

## Catatan teknis

- **MIUI / HyperOS** (Xiaomi/Redmi/Poco): alarm bisa di-suppress saat background tanpa Autostart + Other permissions di-aktifin manual. In-app onboarding ngebantu user setup ini sekali. Tidak ada API publik untuk membaca status izin tersebut.
- **Stack**: Gradle 8.13, AGP 8.13.2, Kotlin 2.3.21, Compose BoM 2026.05.01, Firebase BoM 34.13.0.
- **Tokens design**: ngambil dari Cal.com style (white canvas, dark CTA, hairline borders). Lihat `DESIGN.md`.

## Roadmap

Lihat `ROADMAP.md` untuk status fitur lengkap dan future work.

## Licenses

Lihat `NOTICES.md` untuk atribusi font (Cal Sans + Inter, OFL).
