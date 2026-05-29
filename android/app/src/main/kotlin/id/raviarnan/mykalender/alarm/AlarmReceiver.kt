package id.raviarnan.mykalender.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import id.raviarnan.mykalender.data.Event

/**
 * Fires when an AlarmManager alarm goes off. Launches the full-screen
 * AlarmActivity and the looping AlarmRingingService.
 */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val eventId = intent.getStringExtra(EXTRA_EVENT_ID) ?: return
        val title = intent.getStringExtra(EXTRA_TITLE) ?: ""
        val whenMillis = intent.getLongExtra(EXTRA_WHEN_MILLIS, 0L)
        val soundUri = intent.getStringExtra(EXTRA_SOUND_URI)

        val activityIntent = Intent(context, AlarmActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_HISTORY,
            )
            putExtra(EXTRA_EVENT_ID, eventId)
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_WHEN_MILLIS, whenMillis)
        }
        context.startActivity(activityIntent)

        val serviceIntent = Intent(context, AlarmRingingService::class.java).apply {
            putExtra(EXTRA_EVENT_ID, eventId)
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_SOUND_URI, soundUri)
        }
        ContextCompat.startForegroundService(context, serviceIntent)

        rescheduleIfRecurring(context, eventId)
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

        fun intent(
            context: Context,
            eventId: String,
            title: String,
            whenMillis: Long,
            soundUri: String? = null,
        ): Intent {
            return Intent(context, AlarmReceiver::class.java).apply {
                putExtra(EXTRA_EVENT_ID, eventId)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_WHEN_MILLIS, whenMillis)
                if (soundUri != null) putExtra(EXTRA_SOUND_URI, soundUri)
            }
        }
    }
}
