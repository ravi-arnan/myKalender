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

    fun schedule(event: Event) {
        val now = System.currentTimeMillis()
        val effectiveStartMs = if (event.recurrence.isNullOrBlank() || event.recurrence == RecurrenceHelper.NONE) {
            event.start.toDate().time
        } else {
            RecurrenceHelper
                .nextOccurrenceStart(event.start.toDate(), event.recurrence, java.util.Date(now))
                ?.time
                ?: event.start.toDate().time
        }
        val triggerAt = effectiveStartMs - event.reminderOffsetMinutes * 60_000L

        if (triggerAt > now) {
            val showIntent = PendingIntent.getActivity(
                context,
                event.id.hashCode(),
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            val operation = pendingIntentFor(event, effectiveStartMs)
            val info = AlarmManager.AlarmClockInfo(triggerAt, showIntent)
            alarmManager.setAlarmClock(info, operation)
        }

        schedulePreAlarm(event, effectiveStartMs)
    }

    /**
     * Schedules a quiet heads-up notification 5 minutes before event start.
     * Skipped if the pre-alarm time has passed, or if it would fire within
     * 30 seconds of the main loud alarm (avoid double-notification noise).
     */
    private fun schedulePreAlarm(event: Event, effectiveStartMs: Long) {
        val preTriggerAt = effectiveStartMs - PRE_ALARM_OFFSET_MS
        val now = System.currentTimeMillis()
        if (preTriggerAt <= now) return
        val mainAlarmAt = effectiveStartMs - event.reminderOffsetMinutes * 60_000L
        if (kotlin.math.abs(preTriggerAt - mainAlarmAt) < 30_000L) return

        val operation = PendingIntent.getBroadcast(
            context,
            ("pre_" + event.id).hashCode(),
            PreAlarmReceiver.intent(context, event.id, event.title),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, preTriggerAt, operation)
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
        val pi = PendingIntent.getBroadcast(
            context,
            eventId.hashCode(),
            AlarmReceiver.intent(context, eventId, title = "", whenMillis = 0L),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        alarmManager.cancel(pi)
        pi.cancel()
        cancelPreAlarm(eventId)
    }

    companion object {
        private const val PRE_ALARM_OFFSET_MS = 5 * 60_000L
    }

    /**
     * Replaces the current schedule with the given events: cancels alarms not in
     * the new list, schedules/refreshes the rest.
     */
    fun reconcile(currentlyScheduledIds: Set<String>, events: List<Event>) {
        val newIds = events.map { it.id }.toSet()
        for (id in currentlyScheduledIds - newIds) cancel(id)
        for (event in events) schedule(event)
    }

    private fun pendingIntentFor(event: Event, effectiveStartMs: Long): PendingIntent {
        val intent = AlarmReceiver.intent(
            context,
            eventId = event.id,
            title = event.title,
            whenMillis = effectiveStartMs,
            soundUri = event.alarmSoundUri,
        )
        return PendingIntent.getBroadcast(
            context,
            event.id.hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }
}
