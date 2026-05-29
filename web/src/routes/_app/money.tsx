import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Wallet as WalletIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { auth } from "../../lib/firebase";
import { addMonths, isSameDay, MONTH_NAMES_ID, startOfMonth } from "../../lib/date-utils";
import { getCategoryOrFallback } from "../../lib/money/categories";
import { formatIDR } from "../../lib/money/format";
import { WALLET_TYPE_OPTIONS, type Transaction, type Wallet } from "../../lib/money/types";
import { computeWalletBalances } from "../../lib/money/balances";
import {
  createTransaction,
  deleteTransaction,
  subscribeTransactions,
  updateTransaction,
} from "../../lib/money/transactions";
import {
  createWallet,
  deleteWallet,
  subscribeWallets,
  updateWallet,
} from "../../lib/money/wallets";
import type { TransactionInput, WalletInput } from "../../lib/money/types";
import {
  createBill,
  currentYM,
  deleteBill,
  markBillPaid,
  nextDueDate,
  subscribeBills,
  updateBill,
  type Bill,
  type BillInput,
} from "../../lib/money/bills";
import { useWheelNav } from "../../lib/use-wheel-nav";
import { TransactionDialog } from "../../components/money/TransactionDialog";
import { WalletDialog } from "../../components/money/WalletDialog";
import { BillDialog } from "../../components/money/BillDialog";

export const Route = createFileRoute("/_app/money")({
  component: MoneyPage,
});

type Tab = "transaksi" | "tagihan" | "dompet";

function MoneyPage() {
  const user = auth.currentUser!;
  const [tab, setTab] = useState<Tab>("transaksi");
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletsLoaded, setWalletsLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const loaded = walletsLoaded && txLoaded;

  const [bills, setBills] = useState<Bill[]>([]);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  useEffect(
    () =>
      subscribeWallets(user.uid, (next) => {
        setWallets(next);
        setWalletsLoaded(true);
      }),
    [user.uid],
  );
  useEffect(() => subscribeBills(user.uid, setBills), [user.uid]);
  useEffect(
    () =>
      subscribeTransactions(user.uid, (next) => {
        setTransactions(next);
        setTxLoaded(true);
      }),
    [user.uid],
  );

  const balances = useMemo(
    () => computeWalletBalances(wallets, transactions),
    [wallets, transactions],
  );
  const totalBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + (balances.get(w.id) ?? 0), 0),
    [wallets, balances],
  );

  const monthTx = useMemo(
    () =>
      transactions.filter((t) => {
        const d = t.date.toDate();
        return (
          d.getMonth() === viewMonth.getMonth() &&
          d.getFullYear() === viewMonth.getFullYear()
        );
      }),
    [transactions, viewMonth],
  );

  const { income, expense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTx) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense };
  }, [monthTx]);

  // Group the (date-desc) month transactions into day buckets.
  const dayGroups = useMemo(() => {
    const groups: { date: Date; items: Transaction[] }[] = [];
    for (const t of monthTx) {
      const d = t.date.toDate();
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.date, d)) last.items.push(t);
      else groups.push({ date: d, items: [t] });
    }
    return groups;
  }, [monthTx]);

  function stepMonth(delta: -1 | 1) {
    setViewMonth((m) => addMonths(m, delta));
  }
  const gridRef = useWheelNav<HTMLDivElement>(stepMonth);

  // New transactions default to today when viewing the current month,
  // otherwise to the first day of the month being viewed.
  const newTxDate = useMemo(() => {
    const now = new Date();
    return now.getMonth() === viewMonth.getMonth() &&
      now.getFullYear() === viewMonth.getFullYear()
      ? now
      : viewMonth;
  }, [viewMonth]);

  function openNewTx() {
    setEditingTx(null);
    setTxDialogOpen(true);
  }
  function openEditTx(t: Transaction) {
    setEditingTx(t);
    setTxDialogOpen(true);
  }
  async function handleSaveTx(input: TransactionInput) {
    if (editingTx) await updateTransaction(user.uid, editingTx.id, input);
    else await createTransaction(user.uid, input);
  }
  async function handleDeleteTx() {
    if (editingTx) await deleteTransaction(user.uid, editingTx.id);
  }

  function openNewWallet() {
    setEditingWallet(null);
    setWalletDialogOpen(true);
  }
  function openEditWallet(w: Wallet) {
    setEditingWallet(w);
    setWalletDialogOpen(true);
  }
  async function handleSaveWallet(input: WalletInput) {
    if (editingWallet) await updateWallet(user.uid, editingWallet.id, input);
    else await createWallet(user.uid, input);
  }
  async function handleDeleteWallet() {
    if (editingWallet) await deleteWallet(user.uid, editingWallet.id);
  }

  function openNewBill() {
    setEditingBill(null);
    setBillDialogOpen(true);
  }
  function openEditBill(b: Bill) {
    setEditingBill(b);
    setBillDialogOpen(true);
  }
  async function handleSaveBill(input: BillInput) {
    if (editingBill)
      await updateBill(user.uid, editingBill.id, editingBill.eventId, input);
    else await createBill(user.uid, input);
  }
  async function handleDeleteBill() {
    if (editingBill) await deleteBill(user.uid, editingBill);
  }

  const thisYM = currentYM();
  const hasWallets = wallets.length > 0;

  return (
    <main className="flex-1 flex flex-col overflow-hidden relative">
      {/* Top bar */}
      <div className="h-14 border-b border-hairline px-3 sm:px-5 flex items-center justify-between flex-none gap-2">
        <h2 className="font-display text-base sm:text-xl text-ink">Keuangan</h2>
        <div className="inline-flex items-center rounded-md border border-hairline overflow-hidden">
          {(["transaksi", "tagihan", "dompet"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition border-r border-hairline last:border-r-0 capitalize ${
                tab === t
                  ? "bg-ink text-on-primary"
                  : "text-body hover:bg-surface-soft hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <div className="flex-1" />
      ) : !hasWallets ? (
        <EmptyWallets onCreate={openNewWallet} />
      ) : tab === "transaksi" ? (
        <div ref={gridRef} className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
            {/* Balance + month summary */}
            <section className="rounded-xl border border-hairline bg-surface-card p-5">
              <p className="text-xs font-medium text-muted">Total saldo</p>
              <p className="font-display text-3xl text-ink mt-1">
                {formatIDR(totalBalance)}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <SummaryChip
                  kind="income"
                  label="Masuk"
                  value={income}
                />
                <SummaryChip
                  kind="expense"
                  label="Keluar"
                  value={expense}
                />
              </div>
            </section>

            {/* Month navigator */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">
                {MONTH_NAMES_ID[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </span>
              <div className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => stepMonth(1)}
                  className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Transactions grouped by day */}
            {dayGroups.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">
                Belum ada transaksi bulan ini.
              </p>
            ) : (
              <div className="space-y-5">
                {dayGroups.map((g) => (
                  <div key={g.date.toISOString()}>
                    <p className="text-xs font-medium text-muted mb-2 capitalize">
                      {g.date.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                    <div className="rounded-xl border border-hairline overflow-hidden divide-y divide-hairline">
                      {g.items.map((t) => (
                        <TransactionRow
                          key={t.id}
                          tx={t}
                          walletName={
                            wallets.find((w) => w.id === t.walletId)?.name ?? "—"
                          }
                          onClick={() => openEditTx(t)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : tab === "tagihan" ? (
        /* Tagihan tab */
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-3">
            {bills.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">
                Belum ada tagihan. Tambah tagihan berulang (mis. listrik,
                internet) — akan berbunyi sebagai alarm tiap bulan.
              </p>
            ) : (
              bills.map((b) => (
                <BillCard
                  key={b.id}
                  bill={b}
                  walletName={wallets.find((w) => w.id === b.walletId)?.name ?? "—"}
                  paidThisMonth={b.lastPaidYM === thisYM}
                  onEdit={() => openEditBill(b)}
                  onPay={() => markBillPaid(user.uid, b)}
                />
              ))
            )}
            <button
              type="button"
              onClick={openNewBill}
              className="w-full rounded-xl border border-dashed border-hairline py-3 text-sm font-medium text-muted hover:text-ink hover:border-ink transition flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Tambah tagihan
            </button>
          </div>
        </div>
      ) : (
        /* Dompet tab */
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-3">
            {wallets.map((w) => (
              <WalletCard
                key={w.id}
                wallet={w}
                balance={balances.get(w.id) ?? 0}
                onEdit={() => openEditWallet(w)}
              />
            ))}
            <button
              type="button"
              onClick={openNewWallet}
              className="w-full rounded-xl border border-dashed border-hairline py-3 text-sm font-medium text-muted hover:text-ink hover:border-ink transition flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Tambah dompet
            </button>
          </div>
        </div>
      )}

      {/* FAB: add transaction (only when a wallet exists, on the transaksi tab) */}
      {hasWallets && tab === "transaksi" ? (
        <button
          type="button"
          onClick={openNewTx}
          className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center hover:bg-primary-active transition"
          aria-label="Tambah transaksi"
        >
          <Plus size={24} />
        </button>
      ) : null}

      {txDialogOpen ? (
        <TransactionDialog
          wallets={wallets}
          existing={editingTx ?? undefined}
          initialDate={newTxDate}
          onClose={() => setTxDialogOpen(false)}
          onSave={handleSaveTx}
          onDelete={editingTx ? handleDeleteTx : undefined}
        />
      ) : null}

      {walletDialogOpen ? (
        <WalletDialog
          existing={editingWallet ?? undefined}
          onClose={() => setWalletDialogOpen(false)}
          onSave={handleSaveWallet}
          onDelete={editingWallet ? handleDeleteWallet : undefined}
        />
      ) : null}

      {billDialogOpen ? (
        <BillDialog
          wallets={wallets}
          existing={editingBill ?? undefined}
          onClose={() => setBillDialogOpen(false)}
          onSave={handleSaveBill}
          onDelete={editingBill ? handleDeleteBill : undefined}
        />
      ) : null}
    </main>
  );
}

function BillCard({
  bill,
  walletName,
  paidThisMonth,
  onEdit,
  onPay,
}: {
  bill: Bill;
  walletName: string;
  paidThisMonth: boolean;
  onEdit: () => void;
  onPay: () => void;
}) {
  const due = nextDueDate(bill.dayOfMonth);
  return (
    <div className="rounded-xl border border-hairline p-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-surface-card flex items-center justify-center flex-none text-muted">
          <CalendarClock size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{bill.name}</p>
          <p className="text-xs text-muted">
            Tiap tanggal {bill.dayOfMonth} · {walletName}
          </p>
        </div>
        <div className="text-right flex-none">
          <p className="text-sm font-semibold text-ink">{formatIDR(bill.amount)}</p>
          <p className="text-[11px] text-muted-soft">
            jatuh tempo{" "}
            {due.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition flex-none"
          aria-label="Edit tagihan"
        >
          <Pencil size={15} />
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-hairline-soft">
        {paidThisMonth ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
            <Check size={14} /> Sudah dibayar bulan ini
          </span>
        ) : (
          <button
            type="button"
            onClick={onPay}
            className="text-xs font-semibold text-ink hover:underline"
          >
            Tandai lunas bulan ini → catat pengeluaran
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryChip({
  kind,
  label,
  value,
}: {
  kind: "income" | "expense";
  label: string;
  value: number;
}) {
  const isIncome = kind === "income";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center ${
          isIncome ? "bg-success/15 text-success" : "bg-error/15 text-error"
        }`}
      >
        {isIncome ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
      </span>
      <div>
        <p className="text-[11px] text-muted leading-none">{label}</p>
        <p className="text-sm font-semibold text-ink">{formatIDR(value)}</p>
      </div>
    </div>
  );
}

function TransactionRow({
  tx,
  walletName,
  onClick,
}: {
  tx: Transaction;
  walletName: string;
  onClick: () => void;
}) {
  const cat = getCategoryOrFallback(tx.categoryId, tx.type);
  const Icon = cat.icon;
  const isIncome = tx.type === "income";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-soft transition"
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center flex-none"
        style={{ backgroundColor: cat.color + "22", color: cat.color }}
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink truncate">{tx.note || cat.label}</p>
        <p className="text-xs text-muted truncate">
          {cat.label} · {walletName}
        </p>
      </div>
      <span
        className={`text-sm font-semibold flex-none ${
          isIncome ? "text-success" : "text-ink"
        }`}
      >
        {isIncome ? "+" : "−"}
        {formatIDR(tx.amount)}
      </span>
    </button>
  );
}

function WalletCard({
  wallet,
  balance,
  onEdit,
}: {
  wallet: Wallet;
  balance: number;
  onEdit: () => void;
}) {
  const typeLabel =
    WALLET_TYPE_OPTIONS.find((o) => o.value === wallet.type)?.label ?? "";
  return (
    <div className="rounded-xl border border-hairline p-4 flex items-center gap-3">
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center flex-none text-white"
        style={{ backgroundColor: wallet.color }}
      >
        <WalletIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink truncate">{wallet.name}</p>
        <p className="text-xs text-muted">{typeLabel}</p>
      </div>
      <span className="text-sm font-semibold text-ink">{formatIDR(balance)}</span>
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition flex-none"
        aria-label="Edit dompet"
      >
        <Pencil size={15} />
      </button>
    </div>
  );
}

function EmptyWallets({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
      <span className="w-14 h-14 rounded-full bg-surface-card flex items-center justify-center text-muted mb-4">
        <WalletIcon size={24} />
      </span>
      <h3 className="font-display text-lg text-ink mb-1">Belum ada dompet</h3>
      <p className="text-sm text-muted max-w-xs mb-5">
        Buat dompet dulu (Cash, rekening bank, atau e-wallet) untuk mulai
        mencatat pemasukan & pengeluaran.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary-active transition"
      >
        <Plus size={16} /> Buat dompet pertama
      </button>
    </div>
  );
}
