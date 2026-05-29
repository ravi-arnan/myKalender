import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, Link2, Settings, Sparkles, Wallet } from "lucide-react";

interface BottomNavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const ITEMS: BottomNavItem[] = [
  { to: "/calendar", label: "Kalender", icon: <CalendarDays size={20} /> },
  { to: "/ai", label: "AI", icon: <Sparkles size={20} /> },
  { to: "/money", label: "Keuangan", icon: <Wallet size={20} /> },
  { to: "/accounts", label: "Akun", icon: <Link2 size={20} /> },
  { to: "/settings", label: "Pengaturan", icon: <Settings size={20} /> },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden border-t border-hairline bg-canvas flex items-stretch flex-none">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <span
              className={`flex items-center justify-center w-12 h-7 rounded-full transition ${
                active ? "bg-surface-card" : ""
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
