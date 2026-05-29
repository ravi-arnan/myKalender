# myKalender - Deployment Guide

Deploy myKalender ke Vercel (free tier). Estimasi waktu: 15-30 menit.

---

## Prasyarat

- Akun GitHub (free)
- Akun Vercel terhubung dengan GitHub (vercel.com, signup gratis)
- Repository myKalender sudah commit + push ke GitHub
- Turso cloud DB sudah ready (kita pakai `mykalender` DB di Tokyo)
- Google Cloud OAuth credentials sudah ada
- GitHub Models token

---

## Step 1: Push ke GitHub

```bash
cd ~/Projects/myKalender

# Init git kalau belum
git init
git add .
git commit -m "Initial commit: myKalender MVP"

# Buat repository baru di github.com (private direkomendasikan)
# Lalu link + push:
git remote add origin git@github.com:ravi-arnan/mykalender.git
git branch -M main
git push -u origin main
```

Verifikasi `.gitignore` tidak commit:
- `.env.local`
- `node_modules/`
- `.next/`
- `mykalender.db*` (sudah tidak ada karena pakai cloud)

---

## Step 2: Import ke Vercel

1. Buka https://vercel.com/new
2. Klik "Import" pada repository `mykalender`
3. Vercel auto-detect Next.js framework
4. **JANGAN langsung deploy** — perlu setup env vars dulu

---

## Step 3: Set Environment Variables di Vercel

Di halaman setup project, expand "Environment Variables". Tambahkan satu per satu:

| Name | Value |
|---|---|
| `AUTH_SECRET` | (dari `.env.local`) |
| `AUTH_GOOGLE_ID` | (dari Google Cloud OAuth) |
| `AUTH_GOOGLE_SECRET` | (dari Google Cloud OAuth) |
| `TURSO_DATABASE_URL` | `libsql://mykalender-ravi-arnan.aws-ap-northeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | (dari `turso db tokens create mykalender`) |
| `ENCRYPTION_KEY` | (dari `.env.local`) |
| `GITHUB_MODELS_TOKEN` | (dari `.env.local`) |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` (ganti setelah deploy pertama) |

Apply ke environment: **Production, Preview, Development**.

---

## Step 4: Deploy

Klik **Deploy**. Tunggu ~2-5 menit untuk build pertama.

Setelah selesai, Vercel kasih URL: `https://mykalender-xxx.vercel.app`

---

## Step 5: Update Google OAuth Redirect URIs

Setelah dapat URL Vercel, balik ke Google Cloud Console:

1. https://console.cloud.google.com/apis/credentials
2. Klik OAuth 2.0 Client yang sudah dibuat ("myKalender Web")
3. **Authorized JavaScript origins** tambahkan:
   ```
   https://mykalender-xxx.vercel.app
   ```
4. **Authorized redirect URIs** tambahkan:
   ```
   https://mykalender-xxx.vercel.app/api/auth/callback/google
   https://mykalender-xxx.vercel.app/api/connect-account/callback
   ```
5. Klik **Save**

---

## Step 6: Update NEXT_PUBLIC_APP_URL

Kembali ke Vercel:
1. Project Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL` → ganti ke URL Vercel asli
3. Trigger redeploy (Deployments → klik latest → ... menu → Redeploy)

---

## Step 7: Test Production

1. Buka URL Vercel
2. Klik "Daftar Gratis" → Sign in with Google
3. Akan muncul Google warning "unverified app" (normal untuk testing status)
   - Klik "Advanced" → "Go to myKalender (unsafe)"
4. Connect 1-2 akun Google
5. Test AI Schedule

---

## Optional: Custom Domain

1. Vercel project → Settings → Domains
2. Add domain (misal `mykalender.id` atau subdomain)
3. Set DNS record sesuai instruksi Vercel
4. Update Google OAuth redirect URIs dengan domain baru
5. Update `NEXT_PUBLIC_APP_URL`

---

## Production Checklist

- [ ] Semua env vars terisi di Vercel (Production + Preview)
- [ ] Google OAuth Authorized URIs sudah include URL Vercel
- [ ] Test users di Google Cloud Audience sudah ditambahkan (untuk app status Testing)
- [ ] First deploy sukses (cek logs di Vercel kalau gagal)
- [ ] Sign in flow works di production
- [ ] Connect account flow works
- [ ] AI Schedule works (cek `GITHUB_MODELS_TOKEN` valid)
- [ ] Calendar events tersinkron dari Google

---

## Troubleshooting

### Build gagal di Vercel

Cek build log untuk error spesifik. Yang sering terjadi:
- **`TURSO_DATABASE_URL is not set`**: env var belum di-set di Vercel
- **`MissingSecret`**: `AUTH_SECRET` kosong
- **TypeScript error**: cek dengan `npm run build` lokal dulu

### "Redirect URI mismatch" dari Google

Pastikan URL di Authorized redirect URIs di Google Cloud **persis sama** dengan yang dipanggil aplikasi. Trailing slash, https vs http, port, semua harus match.

### Database connection error

Cek `TURSO_AUTH_TOKEN` belum expired. Token Turso default tidak expire kecuali kamu set TTL waktu generate. Regenerate kalau perlu:
```bash
turso db tokens create mykalender
```

### Rate limit dari GitHub Models

Free tier: ~50 req/hari per model. Kalau habis, AI Schedule akan error. Wait sampai reset (UTC 00:00) atau upgrade akun.

---

## Cost Summary

| Layer | Tier | Limit |
|---|---|---|
| Vercel | Hobby (free) | 100 GB bandwidth/bulan, unlimited deploys |
| Turso | Free | 500 DBs, 9 GB storage, 1 milyar reads/bulan |
| Google Calendar API | Free | 1 juta req/hari |
| GitHub Models | Free | ~50 req/hari per model (lebih untuk personal use) |

**Total cost: $0** untuk MVP + light usage.

---

## Next Steps Setelah Deploy

- Dogfooding: pakai untuk 1-2 minggu, catat bugs
- Tambah analytics (Vercel Analytics gratis built-in)
- Add error tracking (Sentry free tier)
- OAuth verification kalau mau open ke public (skip untuk self-use)
- Custom domain untuk branding
