package id.raviarnan.mykalender.notifications

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import id.raviarnan.mykalender.MainActivity
import id.raviarnan.mykalender.R

/**
 * Posts a heads-up notification when a new event arrives via Firestore — for
 * example when the user added it on the web. Not an alarm: just a soft cue so
 * the user knows the sync went through.
 */
object EventNotifications {

    const val CHANNEL_ID = "events"

    fun postNewEvent(context: Context, eventId: String, title: String) {
        val tap = PendingIntent.getActivity(
            context,
            ("new_" + eventId).hashCode(),
            Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(context.getString(R.string.event_added_title))
            .setContentText(title)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(tap)
            .build()

        val nm = NotificationManagerCompat.from(context)
        if (!nm.areNotificationsEnabled()) return
        try {
            nm.notify(("new_" + eventId).hashCode(), notification)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS not granted — silently skip.
        }
    }
}
