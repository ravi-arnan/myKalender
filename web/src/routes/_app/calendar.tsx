import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { auth } from "../../lib/firebase";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  MONTH_NAMES_ID,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "../../lib/date-utils";
import {
  createEvent,
  deleteEvent,
  subscribeEventsInRange,
  updateEvent,
} from "../../lib/firestore-events";
import {
  deleteGcalEvent,
  pushEventToGcal,
  updateGcalEvent,
} from "../../lib/gcal-sync";
import type { CalendarEvent, CalendarEventInput } from "../../lib/types";
import { MonthView } from "../../components/MonthView";
import { DayView, WeekView } from "../../components/WeekView";
import { EventDialog } from "../../components/EventDialog";
import { Sidebar } from "../../components/Sidebar";
import { SidePanel } from "../../components/SidePanel";

type CalendarView = "month" | "week" | "day";

function formatTitle(view: CalendarView, d: Date): string {
  const monthName = MONTH_NAMES_ID[d.getMonth()];
  const year = d.getFullYear();
  if (view === "month") return `${monthName} ${year}`;
  if (view === "day") return `${d.getDate()} ${monthName} ${year}`;
  // week
  const wStart = startOfWeek(d);
  const wEnd = endOfWeek(d);
  if (wStart.getMonth() === wEnd.getMonth()) {
    return `${wStart.getDate()} - ${wEnd.getDate()} ${monthName} ${year}`;
  }
  return `${wStart.getDate()} ${MONTH_NAMES_ID[wStart.getMonth()]} - ${wEnd.getDate()} ${MONTH_NAMES_ID[wEnd.getMonth()]} ${year}`;
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view: CalendarView;
  onChange: (v: CalendarView) => void;
}) {
  const items: { value: CalendarView; label: string }[] = [
    { value: "day", label: "Hari" },
    { value: "week", label: "Minggu" },
    { value: "month", label: "Bulan" },
  ];
  return (
    <div className="inline-flex items-center rounded-md border border-hairline overflow-hidden">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition border-r border-hairline last:border-r-0 ${
            view === item.value
              ? "bg-ink text-on-primary"
              : "text-body hover:bg-surface-soft hover:text-ink"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const user = auth.currentUser!;
  const [view, setView] = useState<CalendarView>("month");
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<Date>(new Date());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const range = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(viewDate);
      const monthEnd = endOfMonth(viewDate);
      const gridStart = new Date(monthStart);
      gridStart.setDate(monthStart.getDate() - monthStart.getDay());
      const gridEnd = new Date(monthEnd);
      gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
      return { start: gridStart, end: gridEnd };
    }
    if (view === "week") {
      return { start: startOfWeek(viewDate), end: endOfWeek(viewDate) };
    }
    return { start: startOfDay(viewDate), end: endOfDay(viewDate) };
  }, [view, viewDate]);

  useEffect(() => {
    return subscribeEventsInRange(
      user.uid,
      range.start,
      range.end,
      setEvents,
    );
  }, [user.uid, range.start, range.end]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.trim().toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false),
    );
  }, [events, searchQuery]);

  function stepView(delta: number) {
    if (delta === 0) {
      setViewDate(new Date());
      setSelectedDate(new Date());
      return;
    }
    if (view === "month") setViewDate(addMonths(viewDate, delta));
    else if (view === "week") setViewDate(addWeeks(viewDate, delta));
    else setViewDate(addDays(viewDate, delta));
  }

  function handleMiniSelectDate(d: Date) {
    setSelectedDate(d);
    if (view === "month") {
      if (d.getMonth() !== viewDate.getMonth() || d.getFullYear() !== viewDate.getFullYear()) {
        setViewDate(startOfMonth(d));
      }
    } else if (view === "week") {
      setViewDate(d);
    } else {
      setViewDate(d);
    }
  }

  function handleSlotClick(slotStart: Date) {
    setSelectedDate(slotStart);
    setDialogDate(slotStart);
    setEditing(null);
    setDialogOpen(true);
  }

  function handleDayClick(day: Date) {
    setSelectedDate(day);
    const noon = new Date(day);
    noon.setHours(12, 0, 0, 0);
    setDialogDate(noon);
    setEditing(null);
    setDialogOpen(true);
  }

  function handleCreate() {
    handleDayClick(selectedDate);
  }

  async function handleQuickAlarm(minutesFromNow: number) {
    const now = new Date();
    const start = new Date(now.getTime() + minutesFromNow * 60_000);
    const end = new Date(start.getTime() + 30 * 60_000);
    await createEvent(user.uid, {
      title: `Alarm cepat (${minutesFromNow} menit)`,
      start: Timestamp.fromDate(start),
      end: Timestamp.fromDate(end),
      allDay: false,
      reminderOffsetMinutes: 0,
      source: "manual",
    });
  }

  function handleEventClick(ev: CalendarEvent) {
    setEditing(ev);
    setDialogDate(ev.start.toDate());
    setDialogOpen(true);
  }

  async function handleSave(
    input: CalendarEventInput,
    options: { pushToGcal: boolean },
  ) {
    let finalInput = input;
    // Push to GCal first so we can store the returned gcalEventId.
    if (options.pushToGcal && input.source === "manual") {
      try {
        if (input.gcalEventId) {
          await updateGcalEvent(input.gcalEventId, input);
        } else {
          const newId = await pushEventToGcal(input);
          finalInput = { ...input, gcalEventId: newId };
        }
      } catch (e) {
        console.warn("Push to GCal gagal:", e);
        // Don't block save — keep the event in Firestore even if push fails.
      }
    } else if (!options.pushToGcal && input.gcalEventId && input.source === "manual") {
      // User unchecked the sync option for a previously-pushed event.
      try {
        await deleteGcalEvent(input.gcalEventId);
      } catch (e) {
        console.warn("Delete dari GCal gagal:", e);
      }
      finalInput = { ...input, gcalEventId: undefined };
    }

    if (editing) {
      await updateEvent(user.uid, editing.id, finalInput);
    } else {
      await createEvent(user.uid, finalInput);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    // If this manual event was synced to GCal, delete there too.
    if (editing.source === "manual" && editing.gcalEventId) {
      try {
        await deleteGcalEvent(editing.gcalEventId);
      } catch (e) {
        console.warn("Delete dari GCal gagal:", e);
      }
    }
    await deleteEvent(user.uid, editing.id);
  }

  return (
    <>
      <div className="hidden lg:flex">
        <Sidebar
          miniViewDate={viewDate}
          selectedDate={selectedDate}
          onMiniChangeMonth={(delta) => {
            if (delta === 0) {
              setViewDate(new Date());
            } else {
              setViewDate(addMonths(viewDate, delta));
            }
          }}
          onMiniSelectDate={handleMiniSelectDate}
          onCreate={handleCreate}
          onQuickAlarm={handleQuickAlarm}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-14 border-b border-hairline px-3 sm:px-5 flex items-center justify-between flex-none gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => stepView(0)}
              className="text-xs sm:text-sm font-medium text-ink px-2 sm:px-3 py-1.5 rounded-md border border-hairline hover:bg-surface-soft transition shrink-0"
            >
              Hari ini
            </button>
            <div className="inline-flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => stepView(-1)}
                className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition"
                aria-label="Sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => stepView(1)}
                className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition"
                aria-label="Berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <h2 className="font-display text-base sm:text-xl text-ink truncate">
              {formatTitle(view, viewDate)}
            </h2>
          </div>
          <ViewSwitcher view={view} onChange={setView} />
        </div>

        <div className="flex-1 overflow-auto">
          {view === "month" ? (
            <MonthView
              viewDate={viewDate}
              events={filteredEvents}
              selectedDate={selectedDate}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          ) : view === "week" ? (
            <WeekView
              viewDate={viewDate}
              events={filteredEvents}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          ) : (
            <DayView
              viewDate={viewDate}
              events={filteredEvents}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="lg:hidden absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center hover:bg-primary-active transition"
          aria-label="Tambah jadwal"
        >
          <Plus size={24} />
        </button>
      </main>

      <div className="hidden lg:flex">
        <SidePanel onQuickAdd={handleCreate} />
      </div>

      {dialogOpen ? (
        <EventDialog
          initialDate={dialogDate}
          existing={editing ?? undefined}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
        />
      ) : null}
    </>
  );
}
