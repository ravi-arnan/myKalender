package id.raviarnan.mykalender.alarm

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import id.raviarnan.mykalender.MainActivity
import id.raviarnan.mykalender.R
import id.raviarnan.mykalender.data.Event

/**
 * Fires when an AlarmManager alarm goes off. Branches on alarmMode:
 *   - "notification" → posts a heads-up notification on the soft channel
 *   - else (alarm) → launches full-screen AlarmActivity + looping ringer service
 */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val eventId = intent.getStringExtra(EXTRA_EVENT_ID) ?: return
        val title = intent.getStringExtra(EXTRA_TITLE) ?: ""
        val soundUri = intent.getStringExtra(EXTRA_SOUND_URI)
        val alarmMode = intent.getStringExtra(EXTRA_ALARM_MODE)

        if (alarmMode == "notification") {
            postSoftNotification(context, eventId, title)
        } else {
            // Start the ringer service; its notification carries a full-screen
            // intent that launches AlarmActivity over the lockscreen. We do NOT
            // start the activity directly here: on Android 14+ a background
            // BroadcastReceiver can't launch an activity (BAL_BLOCK), so the
            // full-screen intent is the reliable, OS-sanctioned path. When the
            // device is unlocked and in use it surfaces as a loud heads-up the
            // user taps to go full-screen; when locked/off it takes over.
            val serviceIntent = Intent(context, AlarmRingingService::class.java).apply {
                putExtra(EXTRA_EVENT_ID, eventId)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_SOUND_URI, soundUri)
            }
            ContextCompat.startForegroundService(context, serviceIntent)
        }

        rescheduleIfRecurring(context, eventId)
    }

    private fun postSoftNotification(context: Context, eventId: String, title: String) {
        val tap = PendingIntent.getActivity(
            context,
            ("soft_" + eventId).hashCode(),
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_SOFT)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(context.getString(R.string.alarm_soft_title))
            .setContentText(title)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(tap)
            .build()
        val nm = NotificationManagerCompat.from(context)
        if (nm.areNotificationsEnabled()) {
            try {
                nm.notify(("soft_" + eventId).hashCode(), notification)
            } catch (_: SecurityException) {
                // No POST_NOTIFICATIONS permission. Silently skip.
            }
        }
    }

    /**
     * Fetches the event from Firestore and, if it has a recurrence rule,
     * schedules the next occurrence. We use goAsync() because Firestore is
     * async; the receiver stays alive briefly to finish the work.
     */
    private fun rescheduleIfRecurring(context: Context, eventId: String) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val pendingResult = goAsync()
        FirebaseFirestore.getInstance()
            .collection("users")
            .document(uid)
            .collection("events")
            .document(eventId)
            .get()
            .addOnSuccessListener { doc ->
                val event = doc.toObject(Event::class.java)?.copy(id = doc.id)
                if (event != null &&
                    !event.recurrence.isNullOrBlank() &&
                    event.recurrence != RecurrenceHelper.NONE
                ) {
                    AlarmScheduler(context.applicationContext).schedule(event)
                }
                pendingResult.finish()
            }
            .addOnFailureListener { pendingResult.finish() }
    }

    companion object {
        const val EXTRA_EVENT_ID = "extra_event_id"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_WHEN_MILLIS = "extra_when_millis"
        const val EXTRA_SOUND_URI = "extra_sound_uri"
        const val EXTRA_ALARM_MODE = "extra_alarm_mode"
        const val CHANNEL_SOFT = "alarm_soft"

        fun intent(
            context: Context,
            eventId: String,
            title: String,
            whenMillis: Long,
            soundUri: String? = null,
            alarmMode: String? = null,
        ): Intent {
            return Intent(context, AlarmReceiver::class.java).apply {
                putExtra(EXTRA_EVENT_ID, eventId)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_WHEN_MILLIS, whenMillis)
                if (soundUri != null) putExtra(EXTRA_SOUND_URI, soundUri)
                if (alarmMode != null) putExtra(EXTRA_ALARM_MODE, alarmMode)
            }
        }
    }
}
