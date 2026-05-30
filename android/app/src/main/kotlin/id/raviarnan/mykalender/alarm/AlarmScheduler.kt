package id.raviarnan.mykalender.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.content.getSystemService
import id.raviarnan.mykalender.MainActivity
import id.raviarnan.mykalender.data.Event

/**
 * Schedules per-event alarms using AlarmManager.setAlarmClock, which is the
 * highest-priority alarm API on Android. setAlarmClock:
 *   - bypasses Doze and battery optimization
 *   - shows the next-alarm icon in the status bar
 *   - is treated by the OS as user-priority (calendar/clock category)
 *
 * Each alarm fires AlarmReceiver, which then launches the full-screen AlarmActivity.
 */
class AlarmScheduler(private val context: Context) {

    private val alarmManager: AlarmManager = context.getSystemService()!!

    // Records which offsets were scheduled per event id, so cancel() can tear
    // down every alarm an event created (offsets aren't known at cancel time).
    private val prefs = context.getSharedPreferences("scheduled_alarms", Context.MODE_PRIVATE)

    fun schedule(event: Event) {
        // Skip events opted out of alarms (holidays) or with no reminders.
        if (event.source == "gcal-holiday") return
        val offsets = event.effectiveOffsets
        if (offsets.isEmpty()) return

        val now = System.currentTimeMillis()
        val effectiveStartMs = effectiveStartFor(event)

        // One alarm per reminder offset, each with its own request code.
        for (offset in offsets) {
            val triggerAt = effectiveStartMs - offset * 60_000L
            if (triggerAt <= now) continue
            val showIntent = PendingIntent.getActivity(
                context,
                requestCode(event.id, offset),
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            val operation = pendingIntentFor(event, effectiveStartMs, offset)
            val info = AlarmManager.AlarmClockInfo(triggerAt, showIntent)
            // AlarmManager throws if the app's 500-alarm cap is exceeded; never
            // let that crash the app — reconcile() caps us well below the limit,
            // this is just a defensive net.
            runCatching { alarmManager.setAlarmClock(info, operation) }
        }
        prefs.edit().putString(event.id, offsets.joinToString(",")).apply()

        if (event.alarmMode != "notification") {
            schedulePreAlarm(event, effectiveStartMs, offsets)
        }
    }

    private fun requestCode(eventId: String, offset: Long): Int =
        ("$eventId@$offset").hashCode()

    /**
     * Schedules a quiet heads-up notification 5 minutes before event start.
     * Skipped if the pre-alarm time has passed, or if it would fire within
     * 30 seconds of the main loud alarm (avoid double-notification noise).
     */
    private fun schedulePreAlarm(event: Event, effectiveStartMs: Long, offsets: List<Long>) {
        val preTriggerAt = effectiveStartMs - PRE_ALARM_OFFSET_MS
        val now = System.currentTimeMillis()
        if (preTriggerAt <= now) return
        // Skip if any main alarm fires within 30s of the pre-alarm (avoid noise).
        val clashes = offsets.any {
            kotlin.math.abs(preTriggerAt - (effectiveStartMs - it * 60_000L)) < 30_000L
        }
        if (clashes) return

        val operation = PendingIntent.getBroadcast(
            context,
            ("pre_" + event.id).hashCode(),
            PreAlarmReceiver.intent(context, event.id, event.title),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        runCatching {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, preTriggerAt, operation)
        }
    }

    /** Next occurrence start (ms) for recurring events, else the event start. */
    private fun effectiveStartFor(event: Event): Long {
        if (event.recurrence.isNullOrBlank() || event.recurrence == RecurrenceHelper.NONE) {
            return event.start.toDate().time
        }
        val now = System.currentTimeMillis()
        return RecurrenceHelper
            .nextOccurrenceStart(event.start.toDate(), event.recurrence, java.util.Date(now))
            ?.time
            ?: event.start.toDate().time
    }

    private fun cancelPreAlarm(eventId: String) {
        val pi = PendingIntent.getBroadcast(
            context,
            ("pre_" + eventId).hashCode(),
            PreAlarmReceiver.intent(context, eventId, ""),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        alarmManager.cancel(pi)
        pi.cancel()
    }

    /**
     * Schedules a one-shot alarm for `now + minutes` for an event that's
     * already firing. Used by Snooze. The original event keeps its place in
     * Firestore; this just adds a deferred alarm tied to the same event id.
     */
    fun snooze(eventId: String, title: String, minutes: Long) {
        val triggerAt = System.currentTimeMillis() + minutes * 60_000L
        val showIntent = PendingIntent.getActivity(
            context,
            eventId.hashCode(),
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val operation = PendingIntent.getBroadcast(
            context,
            eventId.hashCode(),
            AlarmReceiver.intent(context, eventId, title, triggerAt),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        alarmManager.setAlarmClock(
            AlarmManager.AlarmClockInfo(triggerAt, showIntent),
            operation,
        )
    }

    fun cancel(eventId: String) {
        val offsets = prefs.getString(eventId, null)
            ?.split(",")
            ?.mapNotNull { it.toLongOrNull() }
            .orEmpty()
        // Cancel each per-offset alarm, plus the legacy single-alarm request code
        // (events scheduled by an older build, and snooze, used eventId.hashCode()).
        val codes = (offsets.map { requestCode(eventId, it) } + eventId.hashCode()).distinct()
        for (code in codes) {
            val pi = PendingIntent.getBroadcast(
                context,
                code,
                AlarmReceiver.intent(context, eventId, title = "", whenMillis = 0L),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            alarmManager.cancel(pi)
            pi.cancel()
        }
        prefs.edit().remove(eventId).apply()
        cancelPreAlarm(eventId)
    }

    companion object {
        private const val PRE_ALARM_OFFSET_MS = 5 * 60_000L

        // Android caps an app at 500 concurrent alarms. Each event now uses one
        // alarm per reminder offset (+1 pre-alarm), so we budget by total alarms
        // and schedule only the soonest events that fit. Distant events get
        // scheduled later as nearer ones fire and reconcile re-runs.
        private const val MAX_ALARMS = 450
    }

    /**
     * Replaces the current schedule with the given events: cancels alarms not in
     * the new list, schedules/refreshes the rest. Schedules the soonest events
     * whose alarms fit within [MAX_ALARMS] (each event costs offsets + 1
     * pre-alarm) — the rest are left unscheduled until they come closer.
     */
    fun reconcile(currentlyScheduledIds: Set<String>, events: List<Event>) {
        val eligible = events
            .filter { it.source != "gcal-holiday" && it.effectiveOffsets.isNotEmpty() }
            .sortedBy { effectiveStartFor(it) }

        val schedulable = mutableListOf<Event>()
        var budget = MAX_ALARMS
        for (e in eligible) {
            val cost = e.effectiveOffsets.size + 1 // +1 for the pre-alarm
            if (cost > budget) break
            schedulable.add(e)
            budget -= cost
        }
        val keepIds = schedulable.map { it.id }.toSet()

        for (id in currentlyScheduledIds - keepIds) cancel(id)
        for (event in schedulable) schedule(event)
    }

    private fun pendingIntentFor(event: Event, effectiveStartMs: Long, offset: Long): PendingIntent {
        val intent = AlarmReceiver.intent(
            context,
            eventId = event.id,
            title = event.title,
            whenMillis = effectiveStartMs,
            soundUri = event.alarmSoundUri,
            alarmMode = event.alarmMode,
        )
        return PendingIntent.getBroadcast(
            context,
            requestCode(event.id, offset),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }
}
