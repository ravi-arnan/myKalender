package id.raviarnan.mykalender.data

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

data class EventInput(
    val title: String,
    val description: String? = null,
    val start: Timestamp,
    val end: Timestamp,
    val allDay: Boolean = false,
    val reminderOffsetMinutes: Long = 20,
    val source: String = "manual",
    val gcalEventId: String? = null,
    val alarmSoundUri: String? = null,
    val recurrence: String? = null,
)

class EventRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
) {

    fun upcomingEvents(uid: String): Flow<List<Event>> = callbackFlow {
        val registration = firestore.collection("users")
            .document(uid)
            .collection("events")
            .whereGreaterThanOrEqualTo("start", Timestamp.now())
            .orderBy("start", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot == null) return@addSnapshotListener
                val events = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(Event::class.java)?.copy(id = doc.id)
                }
                trySend(events)
            }
        awaitClose { registration.remove() }
    }

    suspend fun create(uid: String, input: EventInput): String {
        val data = input.toMap() + mapOf(
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        val ref = firestore.collection("users")
            .document(uid)
            .collection("events")
            .add(data)
            .await()
        return ref.id
    }

    suspend fun update(uid: String, eventId: String, input: EventInput) {
        val data = input.toMap() + mapOf("updatedAt" to FieldValue.serverTimestamp())
        firestore.collection("users")
            .document(uid)
            .collection("events")
            .document(eventId)
            .update(data)
            .await()
    }

    suspend fun delete(uid: String, eventId: String) {
        firestore.collection("users")
            .document(uid)
            .collection("events")
            .document(eventId)
            .delete()
            .await()
    }

    private fun EventInput.toMap(): Map<String, Any?> = mapOf(
        "title" to title,
        "description" to description,
        "start" to start,
        "end" to end,
        "allDay" to allDay,
        "reminderOffsetMinutes" to reminderOffsetMinutes,
        "source" to source,
        "gcalEventId" to gcalEventId,
        "alarmSoundUri" to alarmSoundUri,
        "recurrence" to recurrence,
    )
}
