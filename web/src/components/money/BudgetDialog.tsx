import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { formatThousands, parseIDR } from "../../lib/money/format";

interface BudgetDialogProps {
  categoryLabel: string;
  currentAmount: number;
  onClose: () => void;
  /** amount <= 0 removes the budget. */
  onSave: (amount: number) => Promise<void>;
}

export function BudgetDialog({
  categoryLabel,
  currentAmount,
  onClose,
  onSave,
}: BudgetDialogProps) {
  const [amountStr, setAmountStr] = useState(
    currentAmount > 0 ? formatThousands(currentAmount) : "",
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSave(parseIDR(amountStr));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-canvas rounded-xl shadow-2xl w-full max-w-sm border border-hairline overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h3 className="font-display text-lg text-ink">Budget {categoryLabel}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1.5 rounded-md hover:bg-surface-soft transition"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="block text-xs font-medium text-muted">
            Batas pengeluaran per bulan
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={amountStr}
              onChange={(e) => {
                const n = parseIDR(e.target.value);
                setAmountStr(n ? formatThousands(n) : "");
              }}
              placeholder="0"
              className="w-full pl-9 pr-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
            />
          </div>
          <p className="text-[11px] text-muted-soft">
            Kosongkan / isi 0 untuk menghapus budget kategori ini.
          </p>
          {error ? <p className="text-sm text-error">{error}</p> : null}
        </div>

        <div className="px-5 py-4 border-t border-hairline flex items-center justify-end gap-2 bg-surface-soft">
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
      </form>
    </div>
  );
}
