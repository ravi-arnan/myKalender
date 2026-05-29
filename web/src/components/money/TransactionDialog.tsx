import { CalendarDays, FileText, Wallet as WalletIcon, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Timestamp } from "firebase/firestore";
import { formatDateInput, parseDateTimeInput } from "../../lib/date-utils";
import { categoriesFor } from "../../lib/money/categories";
import { formatThousands, parseIDR } from "../../lib/money/format";
import type {
  Transaction,
  TransactionInput,
  TransactionType,
  Wallet,
} from "../../lib/money/types";

interface TransactionDialogProps {
  wallets: Wallet[];
  existing?: Transaction;
  initialDate: Date;
  defaultWalletId?: string;
  onClose: () => void;
  onSave: (input: TransactionInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function TransactionDialog({
  wallets,
  existing,
  initialDate,
  defaultWalletId,
  onClose,
  onSave,
  onDelete,
}: TransactionDialogProps) {
  const [type, setType] = useState<TransactionType>(existing?.type ?? "expense");
  const [amountStr, setAmountStr] = useState(
    existing ? formatThousands(existing.amount) : "",
  );
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? categoriesFor(existing?.type ?? "expense")[0].id,
  );
  const [walletId, setWalletId] = useState(
    existing?.walletId ?? defaultWalletId ?? wallets[0]?.id ?? "",
  );
  const [toWalletId, setToWalletId] = useState(
    existing?.toWalletId ?? wallets[1]?.id ?? wallets[0]?.id ?? "",
  );
  const [date, setDate] = useState(
    formatDateInput(existing ? existing.date.toDate() : initialDate),
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = categoriesFor(type);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function switchType(next: TransactionType) {
    setType(next);
    // Keep the category valid for the new type.
    const validIds = categoriesFor(next).map((c) => c.id);
    if (!validIds.includes(categoryId)) setCategoryId(validIds[0]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amount = parseIDR(amountStr);
    if (amount <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }
    if (!walletId) {
      setError("Pilih dompet dulu");
      return;
    }
    if (type === "transfer" && (!toWalletId || toWalletId === walletId)) {
      setError("Pilih dompet tujuan yang berbeda");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        type,
        amount,
        walletId,
        toWalletId: type === "transfer" ? toWalletId : undefined,
        categoryId: type === "transfer" ? "" : categoryId,
        date: Timestamp.fromDate(parseDateTimeInput(date, "12:00")),
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Hapus transaksi ini?")) return;
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
            {existing ? "Edit transaksi" : "Transaksi baru"}
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
          {/* Type toggle */}
          <div className="grid grid-cols-3 gap-2">
            {(["expense", "income", "transfer"] as const).map((t) => {
              const label =
                t === "income" ? "Pemasukan" : t === "expense" ? "Pengeluaran" : "Transfer";
              const activeClass =
                t === "income"
                  ? "border-success bg-success text-white"
                  : t === "transfer"
                    ? "border-brand-accent bg-brand-accent text-white"
                    : "border-ink bg-ink text-on-primary";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchType(t)}
                  className={`rounded-md border px-2 py-2 text-sm font-semibold transition ${
                    type === t
                      ? activeClass
                      : "border-hairline text-body hover:bg-surface-soft hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl text-muted">
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
              autoFocus
              placeholder="0"
              className="w-full pl-9 pr-0 py-1 border-0 border-b border-hairline focus:outline-none focus:border-ink text-2xl font-semibold text-ink placeholder:text-muted-soft bg-transparent"
            />
          </div>

          {/* Category grid (not for transfers) */}
          {type !== "transfer" ? (
          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Kategori
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const active = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-md border px-1 py-2.5 transition ${
                      active
                        ? "border-ink bg-surface-card"
                        : "border-hairline hover:bg-surface-soft"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: cat.color + "22", color: cat.color }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="text-[10px] leading-tight text-center text-body">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          ) : null}

          {/* Wallet(s) */}
          <Field
            icon={<WalletIcon size={16} />}
            label={type === "transfer" ? "Dari dompet" : "Dompet"}
          >
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

          {type === "transfer" ? (
            <Field icon={<WalletIcon size={16} />} label="Ke dompet">
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {/* Date */}
          <Field icon={<CalendarDays size={16} />} label="Tanggal">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
            />
          </Field>

          {/* Note */}
          <Field icon={<FileText size={16} />} label="Catatan">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opsional"
              className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas placeholder:text-muted-soft"
            />
          </Field>

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
