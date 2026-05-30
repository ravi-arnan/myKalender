package id.raviarnan.mykalender.gcal

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.util.Date

/**
 * Imports Google Calendar events for one account into /users/{uid}/events,
 * mirroring the web's syncCalendarForAccount (gcal-sync.ts): deterministic doc
 * id "gcal_{email}_{eventId}" so re-syncing updates instead of duplicating, and
 * source="gcal" + accountEmail so disconnect can clean up later.
 */
class GcalSyncRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
) {

    data class SyncResult(val imported: Int, val skipped: Int)

    suspend fun syncAccount(
        uid: String,
        accessToken: String,
        accountEmail: String,
        daysAhead: Int,
    ): SyncResult {
        val email = accountEmail.lowercase()
        val raw = GoogleCalendar.fetchPrimaryEvents(accessToken, daysAhead)
        val eventsCol = firestore.collection("users").document(uid).collection("events")

        var imported = 0
        var skipped = 0
        var batch = firestore.batch()
        var ops = 0

        for (ev in raw) {
            if (ev.status == "cancelled") {
                skipped++
                continue
            }
            val start = toTimestamp(ev.start)
            val end = toTimestamp(ev.end)
            if (start == null || end == null) {
                skipped++
                continue
            }
            val docId = "gcal_${email}_${ev.id}"
            val data = mapOf(
                "title" to (ev.summary?.trim()?.ifBlank { null } ?: "(tanpa judul)"),
                "description" to ev.description?.trim()?.ifBlank { null },
                "start" to start.ts,
                "end" to end.ts,
                "allDay" to start.allDay,
                "reminderOffsetMinutes" to 20L,
                "source" to "gcal",
                "gcalEventId" to ev.id,
                "accountEmail" to email,
                "updatedAt" to FieldValue.serverTimestamp(),
            )
            batch.set(eventsCol.document(docId), data, SetOptions.merge())
            ops++
            imported++
            if (ops >= BATCH_LIMIT) {
                batch.commit().await()
                batch = firestore.batch()
                ops = 0
            }
        }
        if (ops > 0) batch.commit().await()

        return SyncResult(imported, skipped)
    }

    private data class TsAllDay(val ts: Timestamp, val allDay: Boolean)

    private fun toTimestamp(field: GoogleCalendar.TimeField?): TsAllDay? {
        if (field == null) return null
        field.dateTime?.let {
            val instant = OffsetDateTime.parse(it).toInstant()
            return TsAllDay(Timestamp(Date.from(instant)), false)
        }
        field.date?.let {
            // All-day: anchor at local midnight, same as the web (`${date}T00:00:00`).
            val instant = LocalDate.parse(it).atStartOfDay(ZoneId.systemDefault()).toInstant()
            return TsAllDay(Timestamp(Date.from(instant)), true)
        }
        return null
    }

    companion object {
        private const val BATCH_LIMIT = 450
    }
}
