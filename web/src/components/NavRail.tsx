import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const ITEMS: NavItem[] = [
  { to: "/calendar", label: "Kalender", icon: <CalendarDays size={18} /> },
  { to: "/ai", label: "AI Jadwal", icon: <Sparkles size={18} /> },
  { to: "/money", label: "Keuangan", icon: <Wallet size={18} /> },
  { to: "/accounts", label: "Akun terhubung", icon: <Link2 size={18} /> },
  { to: "/settings", label: "Pengaturan", icon: <Settings size={18} /> },
];

export function NavRail() {
  const [expanded, setExpanded] = useState(false);
  const { pathname } = useLocation();

  return (
    <nav
      className={`border-r border-hairline bg-canvas flex flex-col py-3 transition-[width] duration-200 ease-out ${
        expanded ? "w-56" : "w-14"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="self-end mr-2 mb-3 w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-surface-soft transition"
        aria-label={expanded ? "Tutup menu" : "Buka menu"}
      >
        {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className="flex flex-col gap-0.5 px-2">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={expanded ? undefined : item.label}
              className={`flex items-center gap-3 rounded-md transition px-2.5 py-2 ${
                active
                  ? "bg-ink text-on-primary"
                  : "text-body hover:bg-surface-soft hover:text-ink"
              }`}
            >
              <span className="shrink-0 w-5 flex items-center justify-center">
                {item.icon}
              </span>
              {expanded ? (
                <span className="text-sm font-medium truncate">
                  {item.label}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
