import { Check, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_KEYS,
  type CustomCategory,
} from "../../lib/money/categories";
import type { CustomCategoryInput } from "../../lib/money/category-store";
import type { TransactionType } from "../../lib/money/types";

const CATEGORY_COLORS = [
  "#fb923c",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#6b7280",
];

interface CategoryDialogProps {
  existing?: CustomCategory;
  defaultKind?: TransactionType;
  onClose: () => void;
  onSave: (input: CustomCategoryInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function CategoryDialog({
  existing,
  defaultKind,
  onClose,
  onSave,
  onDelete,
}: CategoryDialogProps) {
  const [label, setLabel] = useState(existing?.label ?? "");
  const [kind, setKind] = useState<Exclude<TransactionType, "transfer">>(
    (existing?.kind as "income" | "expense") ??
      (defaultKind === "income" ? "income" : "expense"),
  );
  const [color, setColor] = useState(existing?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(existing?.icon ?? "tag");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({ label: label.trim(), kind, color, icon });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (
      !confirm(
        "Hapus kategori ini? Transaksi lama tetap ada tapi kategorinya jadi “Lainnya”.",
      )
    )
      return;
    setSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-canvas rounded-xl shadow-2xl w-full max-w-md border border-hairline overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h3 className="font-display text-lg text-ink">
            {existing ? "Edit kategori" : "Kategori baru"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1.5 rounded-md hover:bg-surface-soft transition"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            placeholder="Nama kategori (mis. Kopi, Investasi)"
            className="w-full px-0 py-1 border-0 border-b border-hairline focus:outline-none focus:border-ink text-lg text-ink placeholder:text-muted-soft bg-transparent"
          />

          {/* Kind */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Jenis</label>
            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-md border px-2 py-2 text-sm font-semibold transition ${
                    kind === k
                      ? k === "income"
                        ? "border-success bg-success text-white"
                        : "border-ink bg-ink text-on-primary"
                      : "border-hairline text-body hover:bg-surface-soft hover:text-ink"
                  }`}
                >
                  {k === "income" ? "Pemasukan" : "Pengeluaran"}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Warna</label>
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Warna ${c}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition"
                  style={{ backgroundColor: c }}
                >
                  {color === c ? <Check size={16} className="text-white" /> : null}
                </button>
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Ikon</label>
            <div className="grid grid-cols-6 gap-2">
              {CATEGORY_ICON_KEYS.map((key) => {
                const Icon = CATEGORY_ICONS[key];
                const active = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    aria-label={`Ikon ${key}`}
                    className={`aspect-square rounded-md border flex items-center justify-center transition ${
                      active
                        ? "border-ink bg-surface-card"
                        : "border-hairline hover:bg-surface-soft"
                    }`}
                    style={active ? { color } : undefined}
                  >
                    <Icon size={18} className={active ? "" : "text-body"} />
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <p className="text-sm text-error">{error}</p> : null}
        </div>

        <div className="px-5 py-4 border-t border-hairline flex items-center justify-between gap-3 bg-surface-soft">
          {existing && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="text-sm font-medium text-error hover:underline disabled:opacity-50"
            >
              Hapus
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-body hover:text-ink rounded-md hover:bg-canvas transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-on-primary hover:bg-primary-active transition disabled:opacity-60"
            >
              {submitting ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
