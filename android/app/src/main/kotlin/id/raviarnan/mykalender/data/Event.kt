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
    // Multiple reminders per event. When non-empty this is the source of truth;
    // legacy events without it fall back to [reminderOffsetMinutes].
    val reminderOffsetsMinutes: List<Long> = emptyList(),
    val source: String = "manual",
    val gcalEventId: String? = null,
    val alarmSoundUri: String? = null,
    val recurrence: String? = null,
    val alarmMode: String? = null,
    val accountEmail: String? = null,
    val createdAt: Timestamp? = null,
) {
    /** When the alarm should fire, in epoch millis. */
    val alarmAtMillis: Long
        get() = start.toDate().time - reminderOffsetMinutes * 60_000L

    /**
     * Reminder offsets that actually apply. Empty for events opted out of
     * alarms (reminderOffsetMinutes < 0, e.g. holidays). Falls back to the
     * single legacy field when the array isn't set.
     */
    val effectiveOffsets: List<Long>
        get() {
            if (reminderOffsetMinutes < 0) return emptyList()
            val arr = reminderOffsetsMinutes.ifEmpty { listOf(reminderOffsetMinutes) }
            return arr.filter { it >= 0 }.distinct().sorted()
        }
}
