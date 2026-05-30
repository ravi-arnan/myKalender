import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

const GITHUB_URL = "https://github.com/ravi-arnan/myKalender";
const LAST_UPDATED = "30 Mei 2026";

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col">
      <header className="border-b border-hairline sticky top-0 z-30 bg-canvas/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="w-7 h-7 rounded-full" />
            <span className="font-display text-lg text-ink">myKalender</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-body hover:text-ink hover:bg-surface-soft transition"
          >
            <ArrowLeft size={14} />
            Beranda
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 sm:px-6 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-surface-soft border border-hairline px-3 py-1 mb-5 text-xs font-medium text-muted">
            <Shield size={12} />
            Kebijakan Privasi
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-ink mb-3 leading-tight">
            Kebijakan Privasi myKalender
          </h1>
          <p className="text-sm text-muted mb-10">
            Terakhir diperbarui: {LAST_UPDATED}
          </p>

          <div className="space-y-8">
            <Section title="Ringkasan">
              <p>
                myKalender adalah aplikasi kalender pribadi non-komersial dengan
                pengingat berbunyi seperti alarm. Aplikasi ini dibuat untuk
                penggunaan pribadi. Kami hanya mengakses data yang kamu izinkan,
                memakainya semata-mata untuk menjalankan fitur aplikasi, dan
                tidak pernah menjualnya ke pihak mana pun.
              </p>
            </Section>

            <Section title="Data yang kami akses">
              <p>Saat kamu menghubungkan akun Google, aplikasi mengakses:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>
                  <strong className="text-ink">Profil dasar</strong> (nama,
                  alamat email, foto profil) — untuk menandai akun yang terhubung.
                </li>
                <li>
                  <strong className="text-ink">Acara Google Calendar (hanya-baca)</strong>{" "}
                  melalui scope{" "}
                  <code className="text-xs bg-surface-soft px-1.5 py-0.5 rounded">
                    calendar.readonly
                  </code>{" "}
                  — untuk menampilkan jadwal kamu dan menjadwalkan alarm
                  pengingat. Aplikasi <strong className="text-ink">tidak</strong>{" "}
                  mengubah atau menghapus acara di Google Calendar kamu.
                </li>
              </ul>
            </Section>

            <Section title="Bagaimana data digunakan">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Menampilkan acara kalender kamu di web dan aplikasi Android.</li>
                <li>
                  Menjadwalkan alarm/pengingat lokal di perangkat berdasarkan
                  waktu acara.
                </li>
                <li>
                  Menggabungkan jadwal dari beberapa akun Google ke satu tampilan
                  (jika kamu menghubungkan lebih dari satu akun).
                </li>
              </ul>
              <p className="mt-3">
                Data tidak digunakan untuk iklan, profiling, maupun analitik.
                Tidak ada server pihak ketiga yang menerima data kalender kamu
                selain layanan penyimpanan milik kamu sendiri (lihat di bawah).
              </p>
            </Section>

            <Section title="Penyimpanan data">
              <p>
                Acara yang di-import disimpan di Google Firebase Firestore, di
                bawah dokumen milik akun kamu sendiri dan dilindungi aturan
                keamanan sehingga hanya kamu yang bisa mengaksesnya. Token akses
                Google <strong className="text-ink">tidak disimpan permanen</strong>{" "}
                — token diminta ulang setiap kali proses sinkronisasi dijalankan.
              </p>
            </Section>

            <Section title="Berbagi data">
              <p>
                Kami <strong className="text-ink">tidak</strong> membagikan,
                menjual, atau memindahkan data kamu ke pihak ketiga. Data hanya
                mengalir antara perangkat kamu, akun Google kamu, dan penyimpanan
                Firestore milik kamu.
              </p>
            </Section>

            <Section title="Penghapusan data">
              <p>Kamu dapat menghapus data kapan saja:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>
                  Buka halaman <strong className="text-ink">Akun</strong>, lalu{" "}
                  <strong className="text-ink">putuskan koneksi</strong> akun
                  Google — seluruh acara yang di-import dari akun itu akan dihapus.
                </li>
                <li>
                  Cabut akses aplikasi kapan saja di{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline underline-offset-2"
                  >
                    Google Account → Pihak ketiga dengan akses akun
                  </a>
                  .
                </li>
                <li>
                  Untuk penghapusan akun secara menyeluruh, hubungi kami (lihat
                  Kontak).
                </li>
              </ul>
            </Section>

            <Section title="Penggunaan Terbatas (Limited Use)">
              <p>
                Penggunaan dan transfer data yang diterima myKalender dari Google
                API akan mematuhi{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline underline-offset-2"
                >
                  Google API Services User Data Policy
                </a>
                , termasuk persyaratan Penggunaan Terbatas (Limited Use). Data
                Google Calendar hanya dipakai untuk menyediakan fitur yang terlihat
                oleh pengguna di dalam aplikasi, tidak ditransfer ke pihak lain
                kecuali untuk menyediakan/meningkatkan fitur tersebut atau jika
                diwajibkan hukum, tidak digunakan untuk iklan, dan tidak ada manusia
                yang membaca data tersebut kecuali atas persetujuan eksplisit kamu,
                untuk keperluan keamanan, atau jika diwajibkan hukum.
              </p>
            </Section>

            <Section title="Kontak">
              <p>
                Aplikasi ini open source. Untuk pertanyaan atau permintaan
                penghapusan data, buka{" "}
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline underline-offset-2"
                >
                  halaman issue di GitHub
                </a>{" "}
                atau lihat{" "}
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline underline-offset-2"
                >
                  repository
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>

      <footer className="border-t border-hairline">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8 flex items-center justify-between gap-4 text-xs text-muted">
          <span>Aplikasi pribadi non-komersial.</span>
          <Link to="/" className="hover:text-ink transition">
            myKalender
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl text-ink mb-3">{title}</h2>
      <div className="text-sm text-body leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}
