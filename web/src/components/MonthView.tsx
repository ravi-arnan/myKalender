import type { CalendarEvent } from "../lib/types";
import {
  formatTime,
  getMonthGridDates,
  isSameDay,
  WEEKDAY_SHORT_ID,
} from "../lib/date-utils";

interface MonthViewProps {
  viewDate: Date;
  events: CalendarEvent[];
  selectedDate?: Date;
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function MonthView({
  viewDate,
  events,
  selectedDate,
  onDayClick,
  onEventClick,
}: MonthViewProps) {
  const today = new Date();
  const dates = getMonthGridDates(viewDate);
  const currentMonth = viewDate.getMonth();

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const d = ev.start.toDate();
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = eventsByDay.get(key) ?? [];
    arr.push(ev);
    eventsByDay.set(key, arr);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b border-hairline">
        {WEEKDAY_SHORT_ID.map((d) => (
          <div
            key={d}
            className="px-1 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted text-center border-r border-hairline last:border-r-0"
          >
            <span className="sm:hidden">{d.charAt(0)}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {dates.map((d) => {
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = d.getMonth() === currentMonth;
          const isToday = isSameDay(d, today);
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;

          return (
            <button
              type="button"
              key={key}
              onClick={() => onDayClick(d)}
              className={`text-left border-b border-r border-hairline p-1 sm:p-1.5 hover:bg-surface-soft transition flex flex-col gap-0.5 sm:gap-1 min-h-[4.5rem] sm:min-h-[7rem] ${
                inMonth ? "bg-canvas" : "bg-hairline-soft/40"
              } ${isSelected ? "ring-1 ring-inset ring-ink/20" : ""}`}
            >
              <div className="flex items-center justify-center">
                <span
                  className={`text-[10px] sm:text-[11px] font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-brand-accent text-on-primary"
                      : inMonth
                        ? "text-ink"
                        : "text-muted-soft"
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className="text-[9px] sm:text-[11px] leading-tight truncate rounded sm:rounded-md px-1 sm:px-1.5 py-0.5 sm:py-1 cursor-pointer transition bg-ink text-on-primary hover:bg-primary-active"
                  >
                    <span className="hidden sm:inline">
                      {ev.allDay ? null : (
                        <span className="font-semibold mr-1 opacity-80">
                          {formatTime(ev.start.toDate())}
                        </span>
                      )}
                    </span>
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 3 ? (
                  <span className="text-[9px] sm:text-[10px] text-muted px-1 sm:px-1.5">
                    +{dayEvents.length - 3}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
