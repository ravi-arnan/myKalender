import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  getMonthGridDates,
  isSameDay,
  MONTH_NAMES_ID,
  weekdayLabels,
} from "../lib/date-utils";
import { usePreferences } from "../lib/preferences";

interface MiniMonthProps {
  viewDate: Date;
  selectedDate?: Date;
  onChangeMonth: (delta: number) => void;
  onSelectDate: (date: Date) => void;
}

export function MiniMonth({
  viewDate,
  selectedDate,
  onChangeMonth,
  onSelectDate,
}: MiniMonthProps) {
  const today = new Date();
  const { weekStart } = usePreferences();
  const dates = getMonthGridDates(viewDate, weekStart);
  const labels = weekdayLabels(weekStart);
  const currentMonth = viewDate.getMonth();

  return (
    <div className="px-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-ink">
          {MONTH_NAMES_ID[currentMonth]} {viewDate.getFullYear()}
        </span>
        <div className="flex items-center gap-0">
          <button
            type="button"
            onClick={() => onChangeMonth(-1)}
            className="p-1 rounded text-muted hover:text-ink hover:bg-surface-soft"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(1)}
            className="p-1 rounded text-muted hover:text-ink hover:bg-surface-soft"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {labels.map((d) => (
          <div
            key={d}
            className="text-[10px] font-medium text-muted-soft text-center py-1"
          >
            {d.charAt(0)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {dates.map((d) => {
          const inMonth = d.getMonth() === currentMonth;
          const isToday = isSameDay(d, today);
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;

          let cls =
            "text-[11px] w-7 h-7 mx-auto rounded-full flex items-center justify-center transition cursor-pointer";
          if (isSelected) {
            cls += " bg-ink text-on-primary";
          } else if (isToday) {
            cls += " text-brand-accent font-semibold hover:bg-surface-soft";
          } else if (inMonth) {
            cls += " text-ink hover:bg-surface-soft";
          } else {
            cls += " text-muted-soft hover:bg-surface-soft";
          }

          return (
            <button
              type="button"
              key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
              onClick={() => onSelectDate(d)}
              className={cls}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function addMonthsForMini(d: Date, n: number): Date {
  return addMonths(d, n);
}
