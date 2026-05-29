package id.raviarnan.mykalender.data

import com.google.firebase.Timestamp

/**
 * Matches the Firestore document under /users/{uid}/events/{eventId}.
 * Field names must match the web app exactly.
 */
data class Event(
    val id: String = "",
    val title: String = "",
    val description: String? = null,
    val start: Timestamp = Timestamp.now(),
    val end: Timestamp = Timestamp.now(),
    val allDay: Boolean = false,
    val reminderOffsetMinutes: Long = 20,
    val source: String = "manual",
    val gcalEventId: String? = null,
    val alarmSoundUri: String? = null,
    val recurrence: String? = null,
) {
    /** When the alarm should fire, in epoch millis. */
    val alarmAtMillis: Long
        get() = start.toDate().time - reminderOffsetMinutes * 60_000L
}
