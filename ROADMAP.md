# myKalender — Roadmap

Tracking pekerjaan yang sudah selesai dan yang akan datang.

Status: **Phase 1 (Web) + Phase 2 (Android alarm) selesai 2026-05-29.** Core requirement teman pengguna — reminder yang bunyi seperti alarm — sudah berfungsi di Redmi Android 15. Web live di https://mykalender-cad8f.web.app. Release APK signed siap distribusi.

## Selesai

### Foundation
- [x] **Web (Vite + React + TanStack Router + Tailwind v4)** di `web/`
- [x] **Android (Kotlin + Jetpack Compose + Material 3)** di `android/`
- [x] **Firebase** project `mykalender-cad8f` (Singapore) — Auth + Firestore + rules
- [x] **Tooling** — `scripts/add-test-event.mjs` lewat firebase-admin

### Web
- [x] Sign-in Google, month-view kalender, CRUD event modal dialog
- [x] Realtime sync Firestore
- [x] NavRail collapsible + AppLauncher 9-dot
- [x] Routes `_app/route.tsx` dengan auth guard di layout
- [x] Pages `/accounts` dan `/settings` (placeholder + theme picker)
- [x] **Mobile-first responsive**: <768px bottom nav + FAB, ≥1024px sidebar+rail+panel
- [x] **Cal Sans + Inter fonts** (OFL licensed)
- [x] **Light default + theme picker** (Terang/Gelap/Sistem) di Settings, persist localStorage
- [x] **Landing page** lengkap di `/` (hero, fitur 3-up, cara kerja, CTA, footer dark)
- [x] **Logo integration** (favicon + brand mark di header/landing/login)
- [x] **Firebase Hosting deploy** di `mykalender-cad8f.web.app`

### Android
- [x] Sign-in Google via Credential Manager
- [x] Firestore listener untuk upcoming events
- [x] `AlarmScheduler.setAlarmClock` (user-priority, nembus Doze)
- [x] `AlarmActivity` full-screen lock screen + `AlarmRingingService` (loop sound + vibrate + wake lock)
- [x] `BootReceiver` re-schedule alarm setelah reboot
- [x] `PermissionsSheet` dengan deep-link ke MIUI Other Permissions / Autostart
- [x] **Full CRUD event** dari Android (FAB + tap card edit + Hapus)
- [x] **Bottom NavigationBar** 3 tab (Kalender / Akun / Pengaturan)
- [x] **Cal Sans + Inter fonts** bundled di res/font
- [x] **Logo launcher icon** di 5 densities + adaptive icon
- [x] **Snooze sesungguhnya** — re-schedule alarm +5 menit lewat AlarmScheduler
- [x] **Custom suara alarm** per-event (RingtoneManager picker)
- [x] **Notifikasi pra-alarm** — heads-up notif 5 menit sebelum event di channel `alarm_preview`
- [x] **Firebase Crashlytics** integrated
- [x] **Signed release APK** — keystore di `.archive/`, config di `keystore.properties`
- [x] **First-launch MIUI onboarding** — auto-open PermissionsSheet sekali per-user via SharedPreferences

## Belum

### Operasional / distribusi
- [ ] **Verifikasi setelah reboot device**
  - Reboot HP teman, pastikan `BootReceiver` re-schedule alarm yang akan datang
  - Testing only, no code change
- [x] **CI/CD GitHub Actions** — done 2026-05-29
  - `.github/workflows/android.yml`: build debug APK on push, upload artifact (14-day retention)
  - `.github/workflows/web.yml`: typecheck + build verification dengan placeholder Firebase env
  - Release APK tetap build manual (keystore gak di-CI untuk keamanan)

### Fitur fungsional besar
- [x] **Sync Google Calendar import (1-arah, client-side)** — done 2026-05-29
  - Tombol "Sync sekarang" di Settings → Google Calendar
  - Fetch primary calendar events 30 hari ke depan via Calendar API v3
  - Upsert ke Firestore dengan doc id `gcal_<eventId>` + source="gcal"
  - Re-auth via signInWithPopup kalau access token expired
- [x] **Reminder recurring** (daily/weekdays/weekly/monthly) — done 2026-05-29
  - Field `recurrence` preset string di Event
  - Picker di EventDialog web + Android
  - `RecurrenceHelper.nextOccurrenceStart()` compute next future occurrence
  - AlarmScheduler pakai next occurrence buat schedule
  - AlarmReceiver re-schedule next setelah alarm fire (Firestore lookup)
- [x] **Multi-akun Google merge ke satu kalender** — done 2026-05-29
  - Pakai Google Identity Services (GIS) token client client-side, gak butuh Firebase Function
  - Halaman `/accounts` interaktif: list akun aktif + tambah akun + sync per-akun + disconnect
  - Storage: `/users/{uid}/connectedAccounts/{email}` (metadata only, gak simpan token)
  - Events namespaced via doc id `gcal_<email>_<eventId>` + field `accountEmail`
  - Disconnect: hapus semua events dari akun itu + hapus metadata
  - Re-auth via popup setiap sync (token gak persist)
- [x] **Sync Google Calendar push 2-arah** — done 2026-05-29
  - Checkbox "Sinkronkan ke Google Calendar" di EventDialog (cuma untuk event manual)
  - createEvent dengan push → POST ke GCal, simpan gcalEventId
  - updateEvent dengan gcalEventId → PATCH GCal
  - deleteEvent dengan gcalEventId → DELETE GCal (Firestore + GCal)
  - Uncheck checkbox di event yang sudah pushed → hapus dari GCal, tetap di myKalender

### Polish kecil
- [x] **Theme picker di Android** — done 2026-05-29
  - `ThemeManager` SharedPreferences-backed, mirror dari web
  - Picker 3 tombol di SettingsScreen (Terang/Gelap/Sistem)
- [x] **Cross-device sync untuk theme preference** — done 2026-05-29
  - Simpan di /users/{uid}.theme (Firestore parent doc, rules updated)
  - Web `hydrateThemeFromFirestore` dipanggil di _app layout pada auth state change
  - Android `ThemeManager.hydrateFromFirestore` dipanggil di MainActivity AppRoot LaunchedEffect
  - Pilih theme di salah satu platform → otomatis terapply di yang lain saat sign-in
- [ ] **Detail event saat klik di web** — skipped
  - Current UX (edit-first dialog dengan Save/Hapus/Batal) sudah cukup; popover terpisah cuma nambah friction

### Skip / out of scope
- ~~Multi-user / share calendar~~ — di luar scope 1 pengguna
- ~~iOS app~~ — alarm hampir mustahil di iOS, dibahas di awal

## Catatan teknis

- **JDK**: build Android wajib JDK 17 (di `gradle.properties`)
- **Gradle**: 8.13, AGP 8.13.2, Kotlin 2.3.21, Compose BoM 2026.05.01, Firebase BoM 34.13.0
- **Test alarm cepat**: `node scripts/add-test-event.mjs <menit> "<judul>" <reminder-offset>`
- **Deploy Firestore rules**: `firebase deploy --only firestore:rules` (dari `myKalender/` root)
- **Deploy web**: `cd web && pnpm build && cd .. && firebase deploy --only hosting`
- **Build release APK**: `cd android && ./gradlew assembleRelease` → `app/build/outputs/apk/release/app-release.apk`
- **Critical untuk MIUI**: tanpa Autostart + Other permissions + No battery restriction, alarm bisa di-suppress saat app di background. Tidak ada API publik untuk membaca status izin tersebut.
- **URL Hosting**: https://mykalender-cad8f.web.app
- **Keystore credentials**: `android/keystore.properties` (gitignored), keystore di `.archive/release.keystore`
