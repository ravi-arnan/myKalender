import { Bell, CalendarClock, Coins, Tag, Volume2, Wallet as WalletIcon, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ALARM_MODE_OPTIONS, REMINDER_OPTIONS, type AlarmMode } from "../../lib/types";
import { EXPENSE_CATEGORIES } from "../../lib/money/categories";
import { formatThousands, parseIDR } from "../../lib/money/format";
import type { Bill, BillInput } from "../../lib/money/bills";
import type { Wallet } from "../../lib/money/types";

interface BillDialogProps {
  wallets: Wallet[];
  existing?: Bill;
  onClose: () => void;
  onSave: (input: BillInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function BillDialog({
  wallets,
  existing,
  onClose,
  onSave,
  onDelete,
}: BillDialogProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [amountStr, setAmountStr] = useState(
    existing ? formatThousands(existing.amount) : "",
  );
  const [dayOfMonth, setDayOfMonth] = useState(existing?.dayOfMonth ?? 1);
  const [walletId, setWalletId] = useState(
    existing?.walletId ?? wallets[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? "bills");
  const [reminderOffset, setReminderOffset] = useState(
    existing?.reminderOffsetMinutes ?? 0,
  );
  const [alarmMode, setAlarmMode] = useState<AlarmMode>(
    existing?.alarmMode ?? "alarm",
  );
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
    if (!name.trim()) {
      setError("Nama tagihan wajib diisi");
      return;
    }
    if (!walletId) {
      setError("Pilih dompet dulu");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        amount: parseIDR(amountStr),
        walletId,
        categoryId,
        dayOfMonth,
        reminderOffsetMinutes: reminderOffset,
        alarmMode,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Hapus tagihan ini? Pengingat alarmnya juga dihapus.")) return;
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
            {existing ? "Edit tagihan" : "Tagihan baru"}
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Nama tagihan (mis. Listrik, Internet)"
            className="w-full px-0 py-1 border-0 border-b border-hairline focus:outline-none focus:border-ink text-lg text-ink placeholder:text-muted-soft bg-transparent"
          />

          <Field icon={<Coins size={16} />} label="Jumlah">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => {
                  const n = parseIDR(e.target.value);
                  setAmountStr(n ? formatThousands(n) : "");
                }}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
              />
            </div>
          </Field>

          <Field icon={<CalendarClock size={16} />} label="Jatuh tempo tiap tanggal">
            <select
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Tanggal {d}
                </option>
              ))}
            </select>
          </Field>

          <Field icon={<WalletIcon size={16} />} label="Dibayar dari">
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>

          <Field icon={<Tag size={16} />} label="Kategori">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field icon={<Bell size={16} />} label="Pengingat">
            <select
              value={reminderOffset}
              onChange={(e) => setReminderOffset(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field icon={<Volume2 size={16} />} label="Mode pengingat">
            <div className="grid grid-cols-2 gap-2">
              {ALARM_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAlarmMode(opt.value)}
                  className={`text-left rounded-md border px-3 py-2 transition ${
                    alarmMode === opt.value
                      ? "border-ink bg-ink text-on-primary"
                      : "border-hairline text-body hover:bg-surface-soft hover:text-ink"
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p
                    className={`text-[10px] leading-tight mt-0.5 ${
                      alarmMode === opt.value ? "opacity-80" : "text-muted"
                    }`}
                  >
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>
          </Field>

          <p className="text-[11px] text-muted-soft">
            Tagihan tampil di kalender & berbunyi tiap bulan otomatis. Tandai
            lunas untuk catat pengeluaran.
          </p>

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

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 mt-2.5 text-muted">{icon}</div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-muted mb-1">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}
