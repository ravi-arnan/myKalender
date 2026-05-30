package id.raviarnan.mykalender.data

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Mirrors the web's /users/{uid}/connectedAccounts/{email} document. Field names
 * must match the web app (connected-accounts.ts) exactly.
 */
data class ConnectedAccount(
    val email: String = "",
    val name: String? = null,
    val picture: String? = null,
    val addedAt: Timestamp? = null,
    val lastSyncedAt: Timestamp? = null,
)

class ConnectedAccountsRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
) {

    private fun col(uid: String) =
        firestore.collection("users").document(uid).collection("connectedAccounts")

    /** Doc id is the lower-cased email, matching the web. */
    private fun docId(email: String) = email.lowercase()

    fun subscribe(uid: String): Flow<List<ConnectedAccount>> = callbackFlow {
        val registration = col(uid).addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot == null) return@addSnapshotListener
            trySend(snapshot.documents.mapNotNull { it.toObject(ConnectedAccount::class.java) })
        }
        awaitClose { registration.remove() }
    }

    suspend fun upsert(uid: String, email: String, name: String?, picture: String?) {
        col(uid).document(docId(email)).set(
            mapOf(
                "email" to email,
                "name" to name,
                "picture" to picture,
                "addedAt" to FieldValue.serverTimestamp(),
            ),
            SetOptions.merge(),
        ).await()
    }

    suspend fun markSynced(uid: String, email: String) {
        col(uid).document(docId(email)).set(
            mapOf("lastSyncedAt" to FieldValue.serverTimestamp()),
            SetOptions.merge(),
        ).await()
    }

    /**
     * Removes the account and deletes every event synced from it
     * (source="gcal" AND accountEmail==email). Manual events are untouched.
     */
    suspend fun disconnect(uid: String, email: String) {
        val normalized = docId(email)
        val eventsCol = firestore.collection("users").document(uid).collection("events")
        val snapshot = eventsCol
            .whereEqualTo("source", "gcal")
            .whereEqualTo("accountEmail", normalized)
            .get()
            .await()

        val docs = snapshot.documents
        var i = 0
        while (i < docs.size) {
            val batch = firestore.batch()
            val chunk = docs.subList(i, minOf(i + BATCH_LIMIT, docs.size))
            for (d in chunk) batch.delete(d.reference)
            batch.commit().await()
            i += chunk.size
        }
        col(uid).document(normalized).delete().await()
    }

    companion object {
        private const val BATCH_LIMIT = 450
    }
}
