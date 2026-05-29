import type { CalendarEvent } from "../lib/types";
import {
  addDays,
  endOfDay,
  formatTime,
  getMonthGridDates,
  isSameDay,
  startOfDay,
  WEEKDAY_SHORT_ID,
} from "../lib/date-utils";

interface MonthViewProps {
  viewDate: Date;
  events: CalendarEvent[];
  selectedDate?: Date;
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const MAX_LANES_PER_WEEK = 4;
const LANE_HEIGHT_PX = 20;
const HEADER_ROW_PX = 26; // day number area at top of each cell

interface PlacedEvent {
  event: CalendarEvent;
  startCol: number;
  endCol: number;
  lane: number;
}

function placeEventsForWeek(
  events: CalendarEvent[],
  weekStart: Date,
  weekEnd: Date,
): { placed: PlacedEvent[]; overflowByDay: Map<number, number> } {
  const weekStartMs = startOfDay(weekStart).getTime();
  const weekEndMs = endOfDay(weekEnd).getTime();

  // Filter to events overlapping this week and sort by start, then by descending duration.
  const candidates = events
    .filter((e) => {
      const evStart = e.start.toDate().getTime();
      const evEnd = e.end.toDate().getTime();
      return evEnd >= weekStartMs && evStart <= weekEndMs;
    })
    .sort((a, b) => {
      const aStart = a.start.toDate().getTime();
      const bStart = b.start.toDate().getTime();
      if (aStart !== bStart) return aStart - bStart;
      const aDur = a.end.toDate().getTime() - aStart;
      const bDur = b.end.toDate().getTime() - bStart;
      return bDur - aDur;
    });

  // Track which lane is occupied per column.
  const laneOccupied: boolean[][] = Array.from({ length: MAX_LANES_PER_WEEK }, () =>
    new Array(7).fill(false),
  );
  const placed: PlacedEvent[] = [];
  const overflowByDay = new Map<number, number>();

  for (const ev of candidates) {
    const evStart = ev.start.toDate();
    const evEnd = ev.end.toDate();
    const startCol = Math.max(
      0,
      Math.floor((startOfDay(evStart).getTime() - weekStartMs) / 86_400_000),
    );
    const endCol = Math.min(
      6,
      Math.floor((startOfDay(evEnd).getTime() - weekStartMs) / 86_400_000),
    );

    let lane = -1;
    for (let l = 0; l < MAX_LANES_PER_WEEK; l++) {
      let free = true;
      for (let c = startCol; c <= endCol; c++) {
        if (laneOccupied[l][c]) {
          free = false;
          break;
        }
      }
      if (free) {
        lane = l;
        break;
      }
    }

    if (lane === -1) {
      // No lane available — count as overflow per day.
      for (let c = startCol; c <= endCol; c++) {
        overflowByDay.set(c, (overflowByDay.get(c) ?? 0) + 1);
      }
      continue;
    }

    for (let c = startCol; c <= endCol; c++) laneOccupied[lane][c] = true;
    placed.push({ event: ev, startCol, endCol, lane });
  }

  return { placed, overflowByDay };
}

function isMultiDay(event: CalendarEvent): boolean {
  const start = startOfDay(event.start.toDate()).getTime();
  const end = startOfDay(event.end.toDate()).getTime();
  return end > start;
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
  const weeks: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7));

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

      <div className="flex-1 grid grid-rows-6">
        {weeks.map((week) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const { placed, overflowByDay } = placeEventsForWeek(
            events,
            weekStart,
            weekEnd,
          );
          const usedLanes = placed.reduce((m, p) => Math.max(m, p.lane + 1), 0);
          const reservedHeight = HEADER_ROW_PX + usedLanes * LANE_HEIGHT_PX;

          return (
            <div
              key={weekStart.toISOString()}
              className="relative grid grid-cols-7"
              style={{ minHeight: `${Math.max(reservedHeight + 24, 96)}px` }}
            >
              {week.map((d) => {
                const inMonth = d.getMonth() === currentMonth;
                const isToday = isSameDay(d, today);
                const isSelected = selectedDate
                  ? isSameDay(d, selectedDate)
                  : false;
                return (
                  <button
                    type="button"
                    key={d.toISOString()}
                    onClick={() => onDayClick(d)}
                    className={`text-left border-b border-r border-hairline p-1 sm:p-1.5 hover:bg-surface-soft transition flex flex-col gap-0.5 ${
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
                  </button>
                );
              })}

              {/* Event bars overlay */}
              <div className="absolute inset-x-0 pointer-events-none" style={{ top: HEADER_ROW_PX }}>
                {placed.map(({ event, startCol, endCol, lane }) => {
                  const widthPct = ((endCol - startCol + 1) / 7) * 100;
                  const leftPct = (startCol / 7) * 100;
                  const isHoliday = event.source === "gcal-holiday";
                  const multi = isMultiDay(event);
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className={`absolute text-[10px] sm:text-[11px] leading-tight px-1.5 py-0.5 rounded-md truncate pointer-events-auto cursor-pointer transition ${
                        isHoliday
                          ? "bg-success/15 text-success border border-success/30 hover:bg-success/25"
                          : multi
                            ? "bg-brand-accent text-on-primary hover:opacity-90"
                            : "bg-ink text-on-primary hover:bg-primary-active"
                      }`}
                      style={{
                        top: `${lane * LANE_HEIGHT_PX}px`,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                      }}
                      title={event.title}
                    >
                      {!event.allDay && !multi ? (
                        <span className="font-semibold mr-1 opacity-80">
                          {formatTime(event.start.toDate())}
                        </span>
                      ) : null}
                      {event.title}
                    </div>
                  );
                })}
              </div>

              {/* "+N more" indicator per day for overflow events */}
              {Array.from(overflowByDay.entries()).map(([col, count]) => (
                <div
                  key={`overflow-${col}`}
                  className="absolute text-[9px] sm:text-[10px] text-muted pointer-events-none"
                  style={{
                    bottom: 4,
                    left: `calc(${(col / 7) * 100}% + 4px)`,
                    width: `calc(${100 / 7}% - 8px)`,
                  }}
                >
                  +{count} lainnya
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Keep unused import warning at bay.
export { addDays };
