package id.raviarnan.mykalender.alarm

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import id.raviarnan.mykalender.MainActivity
import id.raviarnan.mykalender.R

/**
 * Fires 5 minutes before an event starts. Posts a heads-up notification on the
 * preview channel — NOT the loud alarm channel. Acts as a quiet "get ready"
 * cue separate from the main alarm.
 */
class PreAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val eventId = intent.getStringExtra(EXTRA_EVENT_ID) ?: return
        val title = intent.getStringExtra(EXTRA_TITLE) ?: ""

        val tap = PendingIntent.getActivity(
            context,
            ("pre_" + eventId).hashCode(),
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(context.getString(R.string.pre_alarm_title))
            .setContentText(context.getString(R.string.pre_alarm_body, title))
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(tap)
            .build()

        val nm = NotificationManagerCompat.from(context)
        if (nm.areNotificationsEnabled()) {
            try {
                nm.notify(("pre_" + eventId).hashCode(), notification)
            } catch (_: SecurityException) {
                // No POST_NOTIFICATIONS permission — silently skip.
            }
        }
    }

    companion object {
        const val CHANNEL_ID = "alarm_preview"
        const val EXTRA_EVENT_ID = "extra_event_id"
        const val EXTRA_TITLE = "extra_title"

        fun intent(context: Context, eventId: String, title: String): Intent {
            return Intent(context, PreAlarmReceiver::class.java).apply {
                putExtra(EXTRA_EVENT_ID, eventId)
                putExtra(EXTRA_TITLE, title)
            }
        }
    }
}
