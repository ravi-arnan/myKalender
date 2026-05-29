import { BellRing, Plus, Smartphone } from "lucide-react";

interface SidePanelProps {
  onQuickAdd: () => void;
}

export function SidePanel({ onQuickAdd }: SidePanelProps) {
  return (
    <aside className="w-14 border-l border-hairline bg-canvas flex flex-col items-center py-3 gap-2">
      <PanelIcon
        label="Tambah cepat"
        icon={<Plus size={18} />}
        onClick={onQuickAdd}
      />
      <PanelIcon
        label="Status alarm HP"
        icon={<Smartphone size={18} />}
      />
      <PanelIcon
        label="Pengingat"
        icon={<BellRing size={18} />}
      />
    </aside>
  );
}

function PanelIcon({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-9 h-9 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-surface-soft transition"
    >
      {icon}
    </button>
  );
}
