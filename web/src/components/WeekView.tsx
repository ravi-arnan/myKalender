import type { CalendarEvent } from "../lib/types";
import {
  addDays,
  endOfDay,
  formatTime,
  getWeekDates,
  isSameDay,
  startOfDay,
  WEEKDAY_SHORT_ID,
} from "../lib/date-utils";
import { usePreferences } from "../lib/preferences";

interface WeekViewProps {
  viewDate: Date;
  events: CalendarEvent[];
  daysToShow?: number;
  onSlotClick: (slotStart: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({
  viewDate,
  events,
  daysToShow = 7,
  onSlotClick,
  onEventClick,
}: WeekViewProps) {
  const { weekStart } = usePreferences();
  const today = new Date();
  const allDays = daysToShow === 1 ? [startOfDay(viewDate)] : getWeekDates(viewDate, weekStart);
  const days = allDays.slice(0, daysToShow);

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div
        className="grid border-b border-hairline sticky top-0 bg-canvas z-10"
        style={{
          gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="border-r border-hairline" />
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              className="px-2 py-2.5 text-center border-r border-hairline last:border-r-0"
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted">
                {WEEKDAY_SHORT_ID[d.getDay()]}
              </div>
              <div
                className={`mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  isToday
                    ? "bg-brand-accent text-on-primary"
                    : "text-ink"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div
        className="flex-1 overflow-y-auto grid relative"
        style={{
          gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        {/* Hour labels */}
        <div className="border-r border-hairline">
          {HOURS.map((h) => (
            <div
              key={h}
              className="text-[10px] font-medium text-muted text-right pr-2 pt-1"
              style={{ height: HOUR_HEIGHT }}
            >
              {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d) => {
          const dayStart = startOfDay(d);
          const dayEnd = endOfDay(d);
          const dayEvents = events.filter((e) => {
            const evStart = e.start.toDate();
            const evEnd = e.end.toDate();
            return evEnd >= dayStart && evStart <= dayEnd;
          });
          return (
            <div
              key={d.toISOString()}
              className="border-r border-hairline last:border-r-0 relative"
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  onClick={() => {
                    const slot = new Date(d);
                    slot.setHours(h, 0, 0, 0);
                    onSlotClick(slot);
                  }}
                  className="border-b border-hairline-soft cursor-pointer hover:bg-surface-soft transition"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}
              {dayEvents.map((ev) => (
                <EventBlock
                  key={ev.id}
                  event={ev}
                  day={d}
                  onClick={() => onEventClick(ev)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBlock({
  event,
  day,
  onClick,
}: {
  event: CalendarEvent;
  day: Date;
  onClick: () => void;
}) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  const evStart = Math.max(event.start.toDate().getTime(), dayStart);
  const evEnd = Math.min(event.end.toDate().getTime(), dayEnd);

  const startHour = (evStart - dayStart) / (60 * 60 * 1000);
  const durationHours = Math.max(0.5, (evEnd - evStart) / (60 * 60 * 1000));

  if (event.allDay) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="absolute left-1 right-1 top-0 bg-ink text-on-primary text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary-active z-10 truncate"
      >
        {event.title}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute left-1 right-1 bg-ink text-on-primary text-[11px] rounded-md px-1.5 py-1 cursor-pointer hover:bg-primary-active overflow-hidden z-10"
      style={{
        top: startHour * HOUR_HEIGHT + 1,
        height: durationHours * HOUR_HEIGHT - 2,
      }}
    >
      <div className="font-semibold truncate">{event.title}</div>
      <div className="text-[10px] opacity-80 truncate">
        {formatTime(event.start.toDate())} - {formatTime(event.end.toDate())}
      </div>
    </div>
  );
}

// Re-export for convenience: DayView is just WeekView with daysToShow=1.
export function DayView(props: Omit<WeekViewProps, "daysToShow">) {
  return <WeekView {...props} daysToShow={1} />;
}

// Avoid unused import warning.
export { addDays };
