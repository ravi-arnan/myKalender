import { Check, Coins, Tag, Wallet as WalletIcon, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { formatThousands, parseIDR } from "../../lib/money/format";
import {
  WALLET_COLORS,
  WALLET_TYPE_OPTIONS,
  type Wallet,
  type WalletInput,
  type WalletType,
} from "../../lib/money/types";

interface WalletDialogProps {
  existing?: Wallet;
  onClose: () => void;
  onSave: (input: WalletInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function WalletDialog({
  existing,
  onClose,
  onSave,
  onDelete,
}: WalletDialogProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<WalletType>(existing?.type ?? "cash");
  const [balanceStr, setBalanceStr] = useState(
    existing ? formatThousands(existing.initialBalance) : "",
  );
  const [color, setColor] = useState(existing?.color ?? WALLET_COLORS[0]);
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
      setError("Nama dompet wajib diisi");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        type,
        initialBalance: parseIDR(balanceStr),
        color,
        archived: existing?.archived ?? false,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Hapus dompet ini? Transaksinya tidak ikut terhapus.")) return;
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
            {existing ? "Edit dompet" : "Dompet baru"}
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
            placeholder="Nama dompet (mis. Cash, BCA, GoPay)"
            className="w-full px-0 py-1 border-0 border-b border-hairline focus:outline-none focus:border-ink text-lg text-ink placeholder:text-muted-soft bg-transparent"
          />

          <Field icon={<WalletIcon size={16} />} label="Jenis">
            <div className="grid grid-cols-3 gap-2">
              {WALLET_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`rounded-md border px-2 py-2 text-xs font-medium transition ${
                    type === opt.value
                      ? "border-ink bg-ink text-on-primary"
                      : "border-hairline text-body hover:bg-surface-soft hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <Field icon={<Coins size={16} />} label="Saldo awal">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={balanceStr}
                onChange={(e) => {
                  const n = parseIDR(e.target.value);
                  setBalanceStr(n ? formatThousands(n) : "");
                }}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
              />
            </div>
          </Field>

          <Field icon={<Tag size={16} />} label="Warna">
            <div className="flex items-center gap-2 flex-wrap">
              {WALLET_COLORS.map((c) => (
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
