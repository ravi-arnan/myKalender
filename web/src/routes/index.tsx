import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  CloudUpload,
  Smartphone,
  Volume2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col">
      <TopNav />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

function TopNav() {
  return (
    <header className="border-b border-hairline">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-7 h-7 rounded-full" />
          <span className="font-display text-lg text-ink">myKalender</span>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-on-primary px-4 py-1.5 text-sm font-semibold hover:bg-primary-active transition"
        >
          Masuk
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="px-5 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-card px-3 py-1 mb-6">
          <BellRing size={14} className="text-ink" />
          <span className="text-xs font-medium text-ink">
            Reminder bunyi seperti alarm, bukan notifikasi senyap
          </span>
        </div>
        <h1 className="font-display text-4xl sm:text-6xl text-ink mb-5 leading-tight">
          Kalender pribadi yang alarmnya{" "}
          <span className="italic">gak ke-skip.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted leading-relaxed max-w-xl mx-auto mb-8">
          Input jadwal di web, alarmnya bunyi nyaring di HP. Cocok kalau
          notifikasi Google Calendar terlalu pelan buat jadwal yang penting.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-5 py-3 text-sm font-semibold hover:bg-primary-active transition w-full sm:w-auto justify-center"
          >
            Masuk dengan Google
            <ArrowRight size={16} />
          </Link>
          <a
            href="#fitur"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-ink transition px-3 py-2"
          >
            Lihat fiturnya
          </a>
        </div>

        <AlarmMockupCard />
      </div>
    </section>
  );
}

function AlarmMockupCard() {
  return (
    <div className="relative max-w-md mx-auto">
      <div className="absolute inset-x-4 -bottom-3 h-8 bg-ink/10 blur-xl rounded-full" />
      <div className="relative bg-surface-dark rounded-2xl p-6 border border-hairline shadow-xl">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-full bg-on-dark/10 flex items-center justify-center">
            <BellRing size={16} className="text-on-dark" />
          </div>
          <span className="text-xs font-medium text-on-dark-soft uppercase tracking-wider">
            Pengingat berbunyi
          </span>
        </div>
        <p className="font-display text-3xl text-on-dark mb-1.5">
          Rapat tim mingguan
        </p>
        <p className="text-sm text-on-dark-soft mb-8">Senin, 10:00 - 11:00</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="w-full bg-on-dark text-ink rounded-full py-3 text-sm font-semibold cursor-default"
            disabled
          >
            Matikan
          </button>
          <button
            type="button"
            className="w-full border border-on-dark-soft/40 text-on-dark-soft rounded-full py-3 text-xs cursor-default"
            disabled
          >
            Tunda 5 menit
          </button>
        </div>
      </div>
    </div>
  );
}

function Features() {
  const items = [
    {
      icon: <Volume2 size={20} />,
      title: "Alarm beneran, bukan notif",
      body:
        "Pakai AlarmManager Android dengan prioritas user — bunyi keras, layar nyala otomatis, tampil full-screen di lock screen. Tidak di-suppress sama Doze atau battery saver.",
    },
    {
      icon: <CloudUpload size={20} />,
      title: "Sync web + HP otomatis",
      body:
        "Input jadwal dari laptop, alarmnya langsung dijadwal di HP. Edit dari HP juga bisa. Data tersinkron lewat Firestore secara realtime.",
    },
    {
      icon: <Smartphone size={20} />,
      title: "Siap untuk MIUI / HyperOS",
      body:
        "Onboarding satu kali bantu kamu aktifin Autostart + Other permissions di Xiaomi/Redmi/Poco — penyebab utama alarm gagal bunyi di background.",
    },
  ];
  return (
    <section
      id="fitur"
      className="border-t border-hairline px-5 sm:px-6 py-16 sm:py-24"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Beda dari Google Calendar
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-ink max-w-2xl mx-auto">
            Buat jadwal yang gak boleh kelewat.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {items.map((it) => (
            <article
              key={it.title}
              className="bg-surface-card rounded-xl p-6 sm:p-7"
            >
              <div className="w-10 h-10 rounded-md bg-canvas border border-hairline flex items-center justify-center text-ink mb-5">
                {it.icon}
              </div>
              <h3 className="font-display text-xl text-ink mb-2">{it.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Input jadwal di web atau HP",
      body:
        "Buka dashboard, pilih tanggal, set jam mulai dan offset reminder. Bisa juga edit dari Android app.",
    },
    {
      number: "02",
      title: "Sync otomatis ke perangkat lain",
      body:
        "Jadwal langsung tersimpan di Firestore. Android app dengar perubahan secara realtime dan menjadwalkan alarm.",
    },
    {
      number: "03",
      title: "Alarm bunyi nyaring saat waktunya",
      body:
        "Pas reminder time, HP getar + bunyi loop + tampil full-screen. Tap Matikan atau Tunda 5 menit.",
    },
  ];
  return (
    <section className="border-t border-hairline px-5 sm:px-6 py-16 sm:py-24 bg-surface-soft">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Cara kerjanya
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-ink max-w-2xl mx-auto">
            Tiga langkah, alarmnya bunyi.
          </h2>
        </div>
        <ol className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {steps.map((s) => (
            <li
              key={s.number}
              className="bg-canvas rounded-xl p-6 sm:p-7 border border-hairline"
            >
              <span className="font-display text-xl text-muted-soft">
                {s.number}
              </span>
              <h3 className="font-display text-lg text-ink mt-3 mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CtaSection() {
  const bullets = [
    "Sign-in pakai akun Google yang sudah ada",
    "Sync ke HP cuma butuh install APK sekali",
    "Sepenuhnya gratis untuk pribadi",
  ];
  return (
    <section className="border-t border-hairline px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-5xl text-ink mb-5 leading-tight">
          Coba sekarang. Gratis.
        </h2>
        <p className="text-base text-muted mb-8 max-w-xl mx-auto">
          Buat satu jadwal, atur reminder lima menit dari sekarang, tunggu HP-mu
          bunyi. Sesimpel itu untuk lihat bedanya.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-6 py-3 text-sm font-semibold hover:bg-primary-active transition mb-8"
        >
          Masuk dengan Google
          <ArrowRight size={16} />
        </Link>
        <ul className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center text-sm text-muted">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <Check size={14} className="text-ink" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-surface-dark text-on-dark-soft">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="w-7 h-7 rounded-full" />
            <span className="font-display text-lg text-on-dark">myKalender</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={12} />
              Untuk satu pengguna
            </span>
            <span>Made in Bali</span>
          </div>
        </div>
        <p className="text-xs text-on-dark-soft/70 mt-8">
          Aplikasi pribadi non-komersial. Tidak menyimpan data di luar akun Google
          kamu. Source code di GitHub.
        </p>
      </div>
    </footer>
  );
}
