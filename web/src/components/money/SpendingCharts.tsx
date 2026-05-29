import type { Category } from "../../lib/money/categories";
import { formatIDR } from "../../lib/money/format";

interface CategorySlice {
  category: Category;
  amount: number;
}

interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

/**
 * Lightweight pure-SVG charts for the report tab — no charting dependency.
 * A donut of expense-by-category plus a 6-month income/expense line.
 */
export function SpendingCharts({
  categorySpending,
  trend,
}: {
  categorySpending: CategorySlice[];
  trend: TrendPoint[];
}) {
  return (
    <div className="space-y-5">
      {categorySpending.length > 0 ? (
        <CategoryDonut slices={categorySpending} />
      ) : null}
      <TrendChart trend={trend} />
    </div>
  );
}

function CategoryDonut({ slices }: { slices: CategorySlice[] }) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  // Collapse the long tail into "Lainnya" so the legend stays readable.
  const TOP = 5;
  const shown = slices.slice(0, TOP);
  const restAmount = slices.slice(TOP).reduce((s, x) => s + x.amount, 0);
  const legend: { label: string; color: string; amount: number }[] = [
    ...shown.map((s) => ({
      label: s.category.label,
      color: s.category.color,
      amount: s.amount,
    })),
    ...(restAmount > 0
      ? [{ label: "Lainnya", color: "#9ca3af", amount: restAmount }]
      : []),
  ];

  const size = 168;
  const stroke = 24;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;

  let acc = 0;

  return (
    <section className="rounded-xl border border-hairline bg-surface-card p-5">
      <p className="text-xs font-medium text-muted mb-4">Komposisi pengeluaran</p>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative flex-none" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              {legend.map((s) => {
                const len = (s.amount / total) * C;
                const el = (
                  <circle
                    key={s.label}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${len} ${C - len}`}
                    strokeDashoffset={-acc}
                  />
                );
                acc += len;
                return el;
              })}
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted">Total</span>
            <span className="font-display text-base text-ink leading-tight">
              {formatIDR(total)}
            </span>
          </div>
        </div>
        <ul className="flex-1 w-full space-y-1.5">
          {legend.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span
                className="w-2.5 h-2.5 rounded-full flex-none"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-body flex-1 truncate">{s.label}</span>
              <span className="text-muted text-xs tabular-nums">
                {Math.round((s.amount / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const w = 320;
  const h = 120;
  const padX = 8;
  const padY = 12;
  const max = Math.max(1, ...trend.map((t) => Math.max(t.income, t.expense)));
  const stepX = (w - padX * 2) / Math.max(1, trend.length - 1);

  const pointAt = (i: number, value: number) => {
    const x = padX + i * stepX;
    const y = padY + (1 - value / max) * (h - padY * 2);
    return [x, y] as const;
  };
  const line = (key: "income" | "expense") =>
    trend
      .map((t, i) => {
        const [x, y] = pointAt(i, t[key]);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  const hasData = trend.some((t) => t.income > 0 || t.expense > 0);

  return (
    <section className="rounded-xl border border-hairline bg-surface-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted">Tren 6 bulan</p>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-muted">
            <span className="w-2.5 h-0.5 rounded-full bg-success inline-block" />
            Masuk
          </span>
          <span className="flex items-center gap-1 text-muted">
            <span className="w-2.5 h-0.5 rounded-full bg-ink inline-block" />
            Keluar
          </span>
        </div>
      </div>
      {hasData ? (
        <>
          <svg
            width="100%"
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            className="block"
          >
            <path
              d={line("income")}
              fill="none"
              stroke="var(--color-success, #16a34a)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={line("expense")}
              fill="none"
              stroke="var(--color-ink, #111827)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {trend.map((t, i) => {
              const [ex, ey] = pointAt(i, t.expense);
              const [ix, iy] = pointAt(i, t.income);
              return (
                <g key={i}>
                  <circle cx={ix} cy={iy} r={2.5} fill="var(--color-success, #16a34a)" />
                  <circle cx={ex} cy={ey} r={2.5} fill="var(--color-ink, #111827)" />
                </g>
              );
            })}
          </svg>
          <div className="flex justify-between mt-1.5">
            {trend.map((t, i) => (
              <span key={i} className="text-[10px] text-muted capitalize">
                {t.label}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted text-center py-6">
          Belum ada data untuk ditampilkan.
        </p>
      )}
    </section>
  );
}
