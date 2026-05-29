import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  CloudUpload,
  Code,
  Download,
  Globe,
  HelpCircle,
  Repeat,
  Shield,
  Smartphone,
  Sparkles,
  Users,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useAuthUser } from "../lib/use-auth";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const GITHUB_URL = "https://github.com/ravi-arnan/myKalender";
const RELEASES_URL = "https://github.com/ravi-arnan/myKalender/releases";
const LATEST_APK_URL =
  "https://github.com/ravi-arnan/myKalender/releases/download/v0.1.0/myKalender-v0.1.0.apk";
const WEB_URL = "https://mykalender-cad8f.web.app";

function LandingPage() {
  const authed = !!useAuthUser();
  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col">
      <TopNav authed={authed} />
      <main className="flex-1">
        <Hero authed={authed} />
        <StatsRibbon />
        <AiShowcase authed={authed} />
        <Features />
        <Comparison />
        <HowItWorks />
        <FaqSection />
        <DownloadSection />
        <CtaSection authed={authed} />
      </main>
      <Footer />
    </div>
  );
}

function TopNav({ authed }: { authed: boolean }) {
  return (
    <header className="border-b border-hairline sticky top-0 z-30 bg-canvas/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-7 h-7 rounded-full" />
          <span className="font-display text-lg text-ink">myKalender</span>
        </div>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <a
            href="#ai"
            className="px-3 py-1.5 rounded-md text-body hover:text-ink hover:bg-surface-soft transition"
          >
            AI Jadwal
          </a>
          <a
            href="#fitur"
            className="px-3 py-1.5 rounded-md text-body hover:text-ink hover:bg-surface-soft transition"
          >
            Fitur
          </a>
          <a
            href="#cara-kerja"
            className="px-3 py-1.5 rounded-md text-body hover:text-ink hover:bg-surface-soft transition"
          >
            Cara kerja
          </a>
          <a
            href="#faq"
            className="px-3 py-1.5 rounded-md text-body hover:text-ink hover:bg-surface-soft transition"
          >
            FAQ
          </a>
          <a
            href="#download"
            className="px-3 py-1.5 rounded-md text-body hover:text-ink hover:bg-surface-soft transition"
          >
            Download
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-body hover:text-ink hover:bg-surface-soft transition"
            aria-label="GitHub repository"
          >
            <Code size={14} />
            <span className="hidden lg:inline">GitHub</span>
          </a>
          <Link
            to={authed ? "/calendar" : "/login"}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-on-primary px-4 py-1.5 text-sm font-semibold hover:bg-primary-active transition"
          >
            {authed ? "Buka Kalender" : "Masuk"}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero({ authed }: { authed: boolean }) {
  return (
    <section className="px-5 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
      <div className="max-w-3xl mx-auto text-center">
        <a
          href="#ai"
          className="inline-flex items-center gap-2 rounded-full bg-surface-card hover:bg-surface-soft transition px-3 py-1 mb-6 group"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-ink text-on-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles size={10} />
            Baru
          </span>
          <span className="text-xs font-medium text-ink">
            AI Jadwal otomatis dari prompt natural
          </span>
          <ArrowRight
            size={12}
            className="text-muted group-hover:text-ink transition"
          />
        </a>
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
            to={authed ? "/calendar" : "/login"}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-5 py-3 text-sm font-semibold hover:bg-primary-active transition w-full sm:w-auto justify-center"
          >
            {authed ? "Buka Kalender" : "Masuk dengan Google"}
            <ArrowRight size={16} />
          </Link>
          <a
            href="#download"
            className="inline-flex items-center gap-2 text-sm font-medium text-body hover:text-ink transition px-3 py-2"
          >
            <Download size={14} />
            Download APK Android
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

function StatsRibbon() {
  const stats = [
    { value: "1 tahun", label: "Sync GCal otomatis" },
    { value: "365 hari", label: "Hari libur Indonesia" },
    { value: "0 ms", label: "Latensi sync ke HP" },
    { value: "Gratis", label: "Selamanya untuk pribadi" },
  ];
  return (
    <section className="border-y border-hairline bg-surface-soft">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 sm:py-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <p className="font-display text-xl sm:text-2xl text-ink">{s.value}</p>
            <p className="text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiShowcase({ authed }: { authed: boolean }) {
  return (
    <section id="ai" className="px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ink text-on-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider mb-4">
            <Sparkles size={11} />
            AI Jadwal
          </div>
          <h2 className="font-display text-3xl sm:text-4xl text-ink mb-4 leading-tight">
            Ketik rencana kamu, AI yang susun jadwalnya.
          </h2>
          <p className="text-base text-muted leading-relaxed mb-6">
            Tulis aktivitas mingguan dalam bahasa natural. AI pecah jadi event
            terstruktur lengkap dengan recurring, reminder, dan jam. Review
            preview, centang yang mau, lalu tambah ke kalender sekali klik.
          </p>
          <ul className="space-y-2.5 mb-8">
            {[
              "Recurring otomatis (harian, hari kerja, mingguan, bulanan)",
              "Reminder offset di-detect dari konteks prompt",
              "Multi-event sekaligus (kuliah, gym, deadline, meeting)",
              "Opsional sinkron ke Google Calendar saat apply",
            ].map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-sm text-body"
              >
                <Check
                  size={14}
                  className="text-ink mt-0.5 shrink-0"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Link
            to={authed ? "/calendar" : "/login"}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary-active transition"
          >
            Coba AI Jadwal
            <ArrowRight size={14} />
          </Link>
        </div>
        <AiMockupCard />
      </div>
    </section>
  );
}

function AiMockupCard() {
  return (
    <div className="relative">
      <div className="absolute inset-4 -bottom-4 bg-ink/5 blur-2xl rounded-full" />
      <div className="relative bg-canvas rounded-2xl border border-hairline shadow-lg overflow-hidden">
        <div className="border-b border-hairline px-5 py-3 flex items-center gap-2">
          <Sparkles size={14} className="text-ink" />
          <span className="text-sm font-semibold text-ink">AI Jadwal</span>
        </div>
        <div className="p-5">
          <div className="bg-surface-soft rounded-md px-3 py-2.5 mb-4 text-xs text-body leading-relaxed">
            Senin-Jumat saya kuliah Kalkulus jam 8-10 pagi. Selasa dan Kamis
            gym jam 5 sore selama 1 jam. Deadline tugas Fisika 20 Juni 23:59.
          </div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted mb-2">
            Preview (3 jadwal)
          </p>
          <ul className="space-y-2">
            <AiEventRow
              title="Kuliah Kalkulus"
              meta="Senin-Jumat, 08:00-10:00"
              recurrence="Hari kerja"
            />
            <AiEventRow
              title="Gym"
              meta="Selasa, 17:00-18:00"
              recurrence="Tiap minggu"
            />
            <AiEventRow
              title="Deadline tugas Fisika"
              meta="20 Juni, 23:59"
              recurrence={null}
            />
          </ul>
          <button
            type="button"
            disabled
            className="mt-5 w-full bg-ink text-on-primary rounded-md py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-default"
          >
            <Check size={12} />
            Tambah 3 jadwal
          </button>
        </div>
      </div>
    </div>
  );
}

function AiEventRow({
  title,
  meta,
  recurrence,
}: {
  title: string;
  meta: string;
  recurrence: string | null;
}) {
  return (
    <li className="flex items-start gap-2.5 rounded-md border border-ink/80 bg-canvas px-3 py-2">
      <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded bg-ink text-on-primary shrink-0">
        <Check size={9} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock size={9} />
            {meta}
          </span>
          {recurrence ? (
            <span className="inline-flex items-center gap-1">
              <Repeat size={9} />
              {recurrence}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Features() {
  const items = [
    {
      icon: <Volume2 size={20} />,
      title: "Alarm beneran, bukan notif",
      body:
        "AlarmManager Android prioritas user. Bunyi keras, layar nyala otomatis, full-screen di lock screen. Tidak di-suppress sama Doze atau battery saver.",
    },
    {
      icon: <CloudUpload size={20} />,
      title: "Sync web + HP otomatis",
      body:
        "Input dari laptop, alarm dijadwal di HP. Edit dari HP juga bisa. Data sync via Firestore secara realtime, hitungan detik.",
    },
    {
      icon: <Smartphone size={20} />,
      title: "Siap untuk MIUI / HyperOS",
      body:
        "Onboarding satu kali bantu aktifin Autostart + Other permissions di Xiaomi, Redmi, Poco. Penyebab utama alarm gagal bunyi di background.",
    },
    {
      icon: <Sparkles size={20} />,
      title: "AI Schedule Generator",
      body:
        "Ketik aktivitas mingguan kamu, AI parse jadi event terstruktur. Powered by gpt-4o-mini via GitHub Models.",
    },
    {
      icon: <Users size={20} />,
      title: "Multi-akun Google",
      body:
        "Gabungkan jadwal dari beberapa akun Google Calendar (pribadi, kampus, kerja) ke satu dashboard. Setiap akun bisa dilepas sewaktu-waktu.",
    },
    {
      icon: <Globe size={20} />,
      title: "Hari libur Indonesia auto",
      body:
        "Hari libur nasional ditarik dari kalender Google resmi. Update otomatis saat kamu sync. Tidak ramai-ramai jadi alarm.",
    },
  ];
  return (
    <section
      id="fitur"
      className="border-t border-hairline px-5 sm:px-6 py-16 sm:py-24 bg-surface-soft"
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map((it) => (
            <article
              key={it.title}
              className="bg-canvas rounded-xl p-6 sm:p-7 border border-hairline"
            >
              <div className="w-10 h-10 rounded-md bg-surface-soft border border-hairline flex items-center justify-center text-ink mb-5">
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

function Comparison() {
  const rows: Array<{
    feature: string;
    gcal: boolean | string;
    mk: boolean | string;
  }> = [
    { feature: "Lihat semua akun Google di satu tempat", gcal: true, mk: true },
    { feature: "Reminder bunyi keras seperti alarm", gcal: false, mk: true },
    { feature: "Full-screen alert di lock screen", gcal: false, mk: true },
    { feature: "Nembus Doze + battery saver", gcal: false, mk: true },
    { feature: "AI parse jadwal dari natural language", gcal: false, mk: true },
    { feature: "Hari libur Indonesia bawaan", gcal: true, mk: true },
    { feature: "Snooze nyata (re-schedule alarm)", gcal: "Notif only", mk: true },
    { feature: "Tidak butuh paid subscription", gcal: true, mk: true },
    { feature: "Tersedia di iPhone", gcal: true, mk: false },
  ];
  return (
    <section className="border-t border-hairline px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Perbandingan
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-ink">
            myKalender vs Google Calendar
          </h2>
        </div>
        <div className="border border-hairline rounded-xl overflow-hidden bg-canvas">
          <div className="grid grid-cols-[1fr_110px_110px] sm:grid-cols-[1fr_140px_140px] bg-surface-soft border-b border-hairline">
            <div className="px-4 sm:px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
              Fitur
            </div>
            <div className="px-3 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">
              Google Cal
            </div>
            <div className="px-3 py-3 text-center text-xs font-semibold text-ink uppercase tracking-wider">
              myKalender
            </div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.feature}
              className={`grid grid-cols-[1fr_110px_110px] sm:grid-cols-[1fr_140px_140px] ${
                i % 2 === 0 ? "bg-canvas" : "bg-surface-soft/40"
              } border-b border-hairline last:border-b-0`}
            >
              <div className="px-4 sm:px-5 py-3.5 text-sm text-body">
                {r.feature}
              </div>
              <ComparisonCell value={r.gcal} highlight={false} />
              <ComparisonCell value={r.mk} highlight={true} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonCell({
  value,
  highlight,
}: {
  value: boolean | string;
  highlight: boolean;
}) {
  if (typeof value === "string") {
    return (
      <div className="px-3 py-3.5 flex items-center justify-center">
        <span className="text-[11px] text-muted">{value}</span>
      </div>
    );
  }
  return (
    <div className="px-3 py-3.5 flex items-center justify-center">
      {value ? (
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
            highlight ? "bg-ink text-on-primary" : "bg-success/15 text-success"
          }`}
        >
          <Check size={13} strokeWidth={3} />
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-soft text-muted-soft border border-hairline">
          <X size={13} />
        </span>
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Input jadwal di web atau HP",
      body:
        "Buka dashboard, pilih tanggal, set jam mulai dan offset reminder. Bisa juga ketik prompt di AI Jadwal.",
      icon: <CalendarDays size={20} />,
    },
    {
      number: "02",
      title: "Sync otomatis ke perangkat lain",
      body:
        "Jadwal tersimpan di Firestore. Android app dengar perubahan secara realtime dan menjadwalkan alarm sekaligus.",
      icon: <CloudUpload size={20} />,
    },
    {
      number: "03",
      title: "Alarm bunyi nyaring saat waktunya",
      body:
        "Pas reminder time, HP getar + bunyi loop + tampil full-screen. Tap Matikan atau Tunda 5 menit.",
      icon: <BellRing size={20} />,
    },
  ];
  return (
    <section
      id="cara-kerja"
      className="border-t border-hairline px-5 sm:px-6 py-16 sm:py-24 bg-surface-soft"
    >
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
              className="bg-canvas rounded-xl p-6 sm:p-7 border border-hairline relative"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-display text-2xl text-muted-soft">
                  {s.number}
                </span>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-surface-soft border border-hairline text-ink">
                  {s.icon}
                </span>
              </div>
              <h3 className="font-display text-lg text-ink mb-2">{s.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FaqSection() {
  const items = [
    {
      q: "Apakah ada versi iPhone?",
      a: "Belum, dan tidak direncanakan. iOS membatasi background alarm secara ketat sehingga reminder model alarm sulit dibikin reliable. Untuk pengguna iPhone, web app bisa diakses tapi alarm hanya berfungsi saat tab terbuka.",
    },
    {
      q: "Apakah benar-benar gratis?",
      a: "Ya. Firestore free tier cukup untuk satu pengguna, GitHub Models gratis dengan PAT pribadi, dan Android app didistribusikan langsung dari GitHub Releases. Tidak ada paid tier dan tidak ada in-app purchase.",
    },
    {
      q: "Bagaimana dengan privasi data?",
      a: "Data disimpan di Firebase Firestore akun pribadi kamu (lewat Google sign-in). Tidak ada server pihak ketiga, tidak ada analytics. Source code open di GitHub buat audit.",
    },
    {
      q: "Apa bedanya dengan reminder Google Calendar bawaan?",
      a: "Google Calendar pakai notifikasi standar (heads-up, suara default sistem, mudah di-suppress). myKalender pakai AlarmManager.setAlarmClock yang dikategorikan user-priority oleh Android sehingga nembus Doze, DND, dan battery saver.",
    },
    {
      q: "HP saya Xiaomi / Redmi, perlu setup khusus?",
      a: "Ya. MIUI dan HyperOS mematikan background apps secara default. Onboarding sheet di app bantu kamu aktifin Autostart + Other permissions yang dibutuhkan. Setup sekali, tidak perlu diulang.",
    },
    {
      q: "Apakah perlu install aplikasi Android?",
      a: "Web bisa berjalan sendiri untuk input dan view jadwal. Tapi untuk alarm yang bunyi saat tab tertutup atau layar mati, install APK Android yang ada di halaman Releases.",
    },
  ];
  return (
    <section
      id="faq"
      className="border-t border-hairline px-5 sm:px-6 py-16 sm:py-24"
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            FAQ
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-ink">
            Pertanyaan yang sering muncul.
          </h2>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <FaqItem key={it.q} index={i} q={it.q} a={it.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ index, q, a }: { index: number; q: string; a: string }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="border border-hairline rounded-lg bg-canvas overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-soft transition"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 text-sm font-medium text-ink">
          <HelpCircle size={16} className="text-muted shrink-0" />
          {q}
        </span>
        <ChevronDown
          size={16}
          className={`text-muted shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="px-5 pb-4 pt-1 text-sm text-muted leading-relaxed pl-12">
          {a}
        </div>
      ) : null}
    </div>
  );
}

function DownloadSection() {
  return (
    <section
      id="download"
      className="border-t border-hairline px-5 sm:px-6 py-16 sm:py-24 bg-surface-soft"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Mulai pakai
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-ink max-w-2xl mx-auto">
            Dua perangkat, satu kalender.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          <DownloadCard
            icon={<Smartphone size={22} />}
            tag="ANDROID"
            title="Install di HP"
            body="APK signed v0.1.0 untuk Android 8.0 ke atas. Setelah install, login pakai akun Google yang sama dengan web. Onboarding sheet bantu aktifin permission MIUI."
            primary={{
              label: "Download APK",
              href: LATEST_APK_URL,
              icon: <Download size={14} />,
              external: true,
            }}
            secondary={{
              label: "Lihat semua release",
              href: RELEASES_URL,
              external: true,
            }}
          />
          <DownloadCard
            icon={<Zap size={22} />}
            tag="WEB"
            title="Pakai langsung di browser"
            body="Vite + React, PWA-installable. Cocok buat input jadwal dari laptop. Alarm hanya bunyi saat tab terbuka, jadi pasangkan dengan Android untuk reminder lock-screen."
            primary={{
              label: "Buka web app",
              href: WEB_URL,
              icon: <ArrowRight size={14} />,
              external: true,
            }}
            secondary={{
              label: "Source code GitHub",
              href: GITHUB_URL,
              external: true,
            }}
          />
        </div>
      </div>
    </section>
  );
}

function DownloadCard({
  icon,
  tag,
  title,
  body,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  body: string;
  primary: { label: string; href: string; icon: React.ReactNode; external?: boolean };
  secondary: { label: string; href: string; external?: boolean };
}) {
  return (
    <article className="bg-canvas rounded-xl p-6 sm:p-7 border border-hairline flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-ink text-on-primary">
          {icon}
        </span>
        <span className="text-[10px] font-bold tracking-wider text-muted uppercase">
          {tag}
        </span>
      </div>
      <h3 className="font-display text-xl text-ink mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed mb-6 flex-1">{body}</p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={primary.href}
          target={primary.external ? "_blank" : undefined}
          rel={primary.external ? "noopener noreferrer" : undefined}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold hover:bg-primary-active transition"
        >
          {primary.icon}
          {primary.label}
        </a>
        <a
          href={secondary.href}
          target={secondary.external ? "_blank" : undefined}
          rel={secondary.external ? "noopener noreferrer" : undefined}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition"
        >
          {secondary.label}
          <ArrowRight size={12} />
        </a>
      </div>
    </article>
  );
}

function CtaSection({ authed }: { authed: boolean }) {
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
          to={authed ? "/calendar" : "/login"}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-6 py-3 text-sm font-semibold hover:bg-primary-active transition mb-8"
        >
          {authed ? "Buka Kalender" : "Masuk dengan Google"}
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

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

function Footer() {
  const cols: { title: string; links: FooterLink[] }[] = [
    {
      title: "Produk",
      links: [
        { label: "Fitur", href: "#fitur" },
        { label: "AI Jadwal", href: "#ai" },
        { label: "Cara kerja", href: "#cara-kerja" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      title: "Unduh",
      links: [
        { label: "Web app", href: WEB_URL, external: true },
        { label: "APK Android v0.1.0", href: LATEST_APK_URL, external: true },
        { label: "Semua release", href: RELEASES_URL, external: true },
      ],
    },
    {
      title: "Open source",
      links: [
        { label: "Repository", href: GITHUB_URL, external: true },
        {
          label: "Report issue",
          href: `${GITHUB_URL}/issues`,
          external: true,
        },
        {
          label: "Roadmap",
          href: `${GITHUB_URL}/blob/main/ROADMAP.md`,
          external: true,
        },
      ],
    },
  ];
  return (
    <footer className="bg-surface-dark text-on-dark-soft">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8 sm:gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="" className="w-7 h-7 rounded-full" />
              <span className="font-display text-lg text-on-dark">
                myKalender
              </span>
            </div>
            <p className="text-xs leading-relaxed text-on-dark-soft/80 max-w-xs">
              Kalender pribadi dengan alarm yang bunyi seperti alarm beneran.
              Bukan notifikasi senyap.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-[10px] font-bold tracking-wider text-on-dark uppercase mb-3">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.external ? "_blank" : undefined}
                      rel={l.external ? "noopener noreferrer" : undefined}
                      className="text-xs text-on-dark-soft/80 hover:text-on-dark transition inline-flex items-center gap-1"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-on-dark-soft/15 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-on-dark-soft/70">
            Aplikasi pribadi non-komersial. Tidak menyimpan data di luar akun
            Google kamu.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-on-dark-soft/70">
            <span className="inline-flex items-center gap-1.5">
              <Shield size={11} />
              v0.1.0
            </span>
            <span>Made in Bali</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
