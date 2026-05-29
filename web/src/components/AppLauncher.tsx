import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Grid3x3,
  HardDrive,
  HelpCircle,
  Link2,
  LogOut,
  Mail,
  Presentation,
  Settings,
  UserCircle,
  Video,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

interface GoogleService {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const GOOGLE_SERVICES: GoogleService[] = [
  { label: "Akun", href: "https://myaccount.google.com", icon: <UserCircle size={20} /> },
  { label: "Gmail", href: "https://mail.google.com", icon: <Mail size={20} /> },
  { label: "Drive", href: "https://drive.google.com", icon: <HardDrive size={20} /> },
  { label: "Calendar", href: "https://calendar.google.com", icon: <CalendarDays size={20} /> },
  { label: "Docs", href: "https://docs.google.com", icon: <FileText size={20} /> },
  { label: "Sheets", href: "https://sheets.google.com", icon: <FileSpreadsheet size={20} /> },
  { label: "Slides", href: "https://slides.google.com", icon: <Presentation size={20} /> },
  { label: "Meet", href: "https://meet.google.com", icon: <Video size={20} /> },
  { label: "Classroom", href: "https://classroom.google.com", icon: <GraduationCap size={20} /> },
];

export function AppLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-9 h-9 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-surface-soft transition"
        aria-label="App launcher"
      >
        <Grid3x3 size={18} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-80 max-h-[80vh] overflow-y-auto rounded-lg border border-hairline bg-canvas shadow-xl z-20 p-2">
            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider px-2 py-1.5">
              Dalam app
            </h4>
            <div className="grid grid-cols-3 gap-1">
              <LauncherTile
                to="/calendar"
                icon={<CalendarDays size={20} />}
                label="Kalender"
                onClick={() => setOpen(false)}
              />
              <LauncherTile
                to="/accounts"
                icon={<Link2 size={20} />}
                label="Akun"
                onClick={() => setOpen(false)}
              />
              <LauncherTile
                to="/settings"
                icon={<Settings size={20} />}
                label="Pengaturan"
                onClick={() => setOpen(false)}
              />
            </div>

            <div className="border-t border-hairline my-2" />

            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider px-2 py-1.5">
              Layanan Google
            </h4>
            <div className="grid grid-cols-3 gap-1">
              {GOOGLE_SERVICES.map((svc) => (
                <ExternalTile
                  key={svc.label}
                  href={svc.href}
                  icon={svc.icon}
                  label={svc.label}
                />
              ))}
            </div>

            <div className="border-t border-hairline my-2" />

            <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider px-2 py-1.5">
              Lainnya
            </h4>
            <ExternalRow
              href="https://github.com/ravi-arnan/myKalender"
              icon={<HelpCircle size={16} />}
              label="Source code & bantuan"
            />

            <div className="border-t border-hairline my-2" />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut(auth);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-body hover:bg-surface-soft hover:text-ink transition"
            >
              <LogOut size={16} />
              Keluar
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function LauncherTile({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-md hover:bg-surface-soft transition group"
    >
      <span className="text-ink">{icon}</span>
      <span className="text-[11px] font-medium text-body group-hover:text-ink">
        {label}
      </span>
    </Link>
  );
}

function ExternalTile({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-md hover:bg-surface-soft transition group relative"
    >
      <span className="text-ink">{icon}</span>
      <span className="text-[11px] font-medium text-body group-hover:text-ink">
        {label}
      </span>
      <ExternalLink
        size={9}
        className="absolute top-2 right-2 text-muted-soft opacity-0 group-hover:opacity-100 transition"
      />
    </a>
  );
}

function ExternalRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm text-body hover:bg-surface-soft hover:text-ink transition group"
    >
      <span className="flex items-center gap-2.5">
        <span className="text-muted group-hover:text-ink">{icon}</span>
        {label}
      </span>
      <ExternalLink size={12} className="text-muted-soft" />
    </a>
  );
}
