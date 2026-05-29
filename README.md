<div align="center">

# myKalender

**A personal calendar that rings like a real alarm clock — not a silent notification.**

Built because Google Calendar reminders are too quiet for schedules you can't afford to miss.

[![Web CI](https://github.com/ravi-arnan/myKalender/actions/workflows/web.yml/badge.svg)](https://github.com/ravi-arnan/myKalender/actions/workflows/web.yml)
[![Android CI](https://github.com/ravi-arnan/myKalender/actions/workflows/android.yml/badge.svg)](https://github.com/ravi-arnan/myKalender/actions/workflows/android.yml)

[Live demo](https://mykalender-cad8f.web.app) · [Roadmap](./ROADMAP.md) · [Design system](./DESIGN.md)

</div>

---

## Why this exists

Google Calendar's H-20-minute reminder is a soft chime that's easy to miss when your phone is on silent or in a bag. myKalender's Android client uses `AlarmManager.setAlarmClock` — the same priority class as your phone's built-in alarm clock — combined with a full-screen activity, looping ringtone, vibration, and wake-lock to surface reminders loud and unavoidable, even through Doze mode and Do Not Disturb.

## Features

### Calendar & sync

- Google sign-in (Firebase Auth) shared across web and Android
- Create, edit, delete events from either platform
- Real-time sync via Firestore snapshot listeners
- Month / Week / Day views on web
- Google Calendar two-way sync (import + push)
- Multi-account Google merge — connect several Google accounts into a single unified view

### Alarm reliability

- `AlarmManager.setAlarmClock()` — user-priority, bypasses Doze
- Full-screen alarm activity over the lock screen
- Foreground service that loops the ringtone, vibrates, and holds a wake-lock until dismissed
- Per-event custom alarm sound via the system ringtone picker
- Heads-up pre-alarm notification 5 minutes before the event
- Real snooze (re-schedules `+5 min` via `AlarmManager`)
- Recurring reminders (daily / weekdays / weekly / monthly) — auto-reschedules the next occurrence after each fire
- `BootReceiver` re-arms scheduled alarms after device reboot
- In-app onboarding sheet that deep-links to MIUI's Autostart and Other Permissions screens

### UI / UX

- Cal.com-inspired design tokens (white canvas, dark CTAs, hairline borders, generous whitespace)
- Cal Sans + Inter typography (both OFL licensed)
- Light / Dark / System theme picker, synced across devices via Firestore
- Mobile-first responsive layout (web) with bottom navigation under 768 px
- PWA installable from any modern browser
- Landing page, NavRail, AppLauncher (9-dot), Sidebar, Side panel
- Quick alarm widget — preset buttons for 5 / 15 / 30 / 60 minute alarms

### Infrastructure

- Firebase Hosting deployment
- Firebase Crashlytics for production error tracking
- Firestore security rules scoped per user
- GitHub Actions CI/CD: Android debug APK build, web typecheck + build
- Signed release APK with externalized keystore config

## Architecture

```
┌─────────────────────┐        ┌─────────────────────────┐
│ Web (Vite + React)  │        │ Android (Kotlin Compose)│
│ Month/Week/Day view │        │ Loud alarm + lock-screen│
│ GCal sync + multi-  │        │ AlarmManager.setAlarm.. │
│ account merge       │        │ Foreground ringing svc  │
└──────────┬──────────┘        └────────────┬────────────┘
           │      Firestore realtime sync   │
           └────────────────┬───────────────┘
                            │
                  ┌─────────▼──────────┐
                  │ Firebase           │
                  │  · Auth (Google)   │
                  │  · Firestore       │
                  │  · Hosting         │
                  │  · Crashlytics     │
                  └─────────┬──────────┘
                            │ OAuth access token
                            ▼
                  ┌────────────────────┐
                  │ Google Calendar    │
                  │ API v3             │
                  └────────────────────┘
```

## Tech stack

| Layer        | Technology                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| Web          | Vite 8 · React 19 · TanStack Router · Tailwind v4 · TypeScript             |
| Android      | Kotlin 2.3 · Jetpack Compose · Material 3 · AGP 8.13 · JDK 17              |
| Backend      | Firebase Auth · Firestore · Hosting · Crashlytics                          |
| Sync         | Google Calendar API v3 · Google Identity Services                          |
| Fonts        | Cal Sans (OFL) · Inter (OFL)                                               |
| Build / CI   | pnpm 10 · Gradle 8.13 · GitHub Actions                                     |

## Project structure

```
myKalender/
├── web/                       Vite + React app
│   ├── src/
│   │   ├── routes/            TanStack file-based routes
│   │   ├── components/        UI components (Sidebar, MonthView, etc.)
│   │   └── lib/               Firebase, types, GCal sync, theme, etc.
│   └── public/                Static assets (logo, fonts, manifest)
├── android/                   Kotlin + Compose app
│   └── app/src/main/
│       └── kotlin/id/raviarnan/mykalender/
│           ├── alarm/         AlarmScheduler, AlarmReceiver, AlarmActivity, ...
│           ├── auth/          AuthRepository (Credential Manager)
│           ├── data/          Event, EventRepository (Firestore)
│           ├── permissions/   PermissionsHelper, PermissionsSheet
│           └── ui/            theme/ + screens/
├── scripts/                   Node scripts (test event injection)
├── docs/                      PRD, plans, mockups
├── .github/workflows/         CI/CD for Android + Web
├── firebase.json              Hosting + Firestore config
├── firestore.rules            Security rules
├── ROADMAP.md                 Feature roadmap
└── DESIGN.md                  Design system reference
```

## Getting started

### Prerequisites

- Node.js 22+ and pnpm 10+
- JDK 17 (referenced in `android/gradle.properties`)
- Android SDK (build-tools 35+, platforms 36+)
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Authentication (Google provider) and Firestore (Native mode)

### Web

```bash
cd web
cp .env.example .env.local        # populate with your Firebase web config
pnpm install
pnpm dev                          # http://localhost:5173
```

### Android

1. Create an Android app in your Firebase Console using package name `id.raviarnan.mykalender` and your debug SHA-1. Place the downloaded `google-services.json` at `android/app/google-services.json`.
2. Enable Google sign-in in Authentication → Sign-in method.
3. Build and install on a connected device:

```bash
cd android
./gradlew installDebug
```

### Firestore rules

```bash
firebase deploy --only firestore:rules
```

## Build & deploy

### Web production build & deploy

```bash
cd web && pnpm build
cd .. && firebase deploy --only hosting
```

### Android signed release APK

```bash
# 1. Generate a release keystore (one-time)
keytool -genkey -v -keystore /path/to/release.keystore \
  -alias mykalender -keyalg RSA -keysize 2048 -validity 25000

# 2. Create android/keystore.properties (gitignored):
#    storeFile=/absolute/path/to/release.keystore
#    storePassword=...
#    keyAlias=mykalender
#    keyPassword=...

# 3. Build
cd android && ./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Continuous integration

Pushing to `main` triggers two workflows:

- **Android CI** — builds a debug APK and uploads it as a 14-day artifact.
- **Web CI** — runs TypeScript type-checking and a production build with placeholder Firebase environment variables.

## Quick alarm test

The fastest end-to-end smoke test injects an event 1–3 minutes ahead via the Firebase Admin SDK:

```bash
cd scripts
pnpm install
# Place your service account JSON at .archive/<file>.json and edit the script's UID.
node add-test-event.mjs 3 "Tes Alarm" 0
```

On a connected Android device, the alarm should ring at the start time, present the full-screen activity, and stay active until dismissed.

## Notes on Android OEMs

Xiaomi, Redmi, and Poco devices running MIUI / HyperOS aggressively kill background apps by default. The app's first-launch onboarding deep-links the user into the relevant settings:

- **Autostart** — required so alarms can fire after the app is closed.
- **Other permissions → Display pop-up windows / Show on lock screen / Start in background** — required for the full-screen alarm activity to surface.
- **Battery saver → No restrictions** — prevents the OS from delaying the alarm.

There is no public API to programmatically read these settings, so the in-app sheet marks them as "manual check" rather than auto-detected.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the complete feature roadmap, including completed items and planned work.

## Acknowledgments

- **Cal Sans** display typeface by Cal.com — [calcom/font](https://github.com/calcom/font), SIL Open Font License 1.1
- **Inter** sans typeface by Rasmus Andersson — [rsms/inter](https://github.com/rsms/inter), SIL Open Font License 1.1
- Design system inspired by Cal.com's marketing surface (white canvas, dark CTAs, hairline borders, generous whitespace).

Third-party assets and their licenses are listed in [NOTICES.md](./NOTICES.md).

## License

This project's source code is currently unlicensed (all rights reserved). Reach out if you'd like to use or contribute.

The bundled fonts retain their original SIL Open Font License 1.1 terms.
