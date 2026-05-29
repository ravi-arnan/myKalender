package id.raviarnan.mykalender.data.money

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import id.raviarnan.mykalender.data.EventInput
import id.raviarnan.mykalender.data.EventRepository
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.Date

/**
 * Firestore access for myDuit. Bills own a linked monthly CalendarEvent (via
 * EventRepository) so the existing alarm pipeline fires them with no extra code.
 */
class MoneyRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val events: EventRepository = EventRepository(),
) {
    private fun col(uid: String, name: String) =
        firestore.collection("users").document(uid).collection(name)

    // ------------------------------------------------------------- Wallets --

    fun wallets(uid: String): Flow<List<Wallet>> = callbackFlow {
        val reg = col(uid, "wallets")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snap, err ->
                if (err != null) { close(err); return@addSnapshotListener }
                if (snap == null) return@addSnapshotListener
                trySend(snap.documents.mapNotNull { d ->
                    d.toObject(Wallet::class.java)?.copy(id = d.id)
                })
            }
        awaitClose { reg.remove() }
    }

    suspend fun createWallet(uid: String, input: WalletInput) {
        col(uid, "wallets").add(input.toMap() + serverStamps()).await()
    }

    suspend fun updateWallet(uid: String, id: String, input: WalletInput) {
        col(uid, "wallets").document(id)
            .update(input.toMap() + mapOf("updatedAt" to FieldValue.serverTimestamp()))
            .await()
    }

    suspend fun deleteWallet(uid: String, id: String) {
        col(uid, "wallets").document(id).delete().await()
    }

    // -------------------------------------------------------- Transactions --

    fun transactions(uid: String): Flow<List<Transaction>> = callbackFlow {
        val reg = col(uid, "transactions")
            .orderBy("date", Query.Direction.DESCENDING)
            .addSnapshotListener { snap, err ->
                if (err != null) { close(err); return@addSnapshotListener }
                if (snap == null) return@addSnapshotListener
                trySend(snap.documents.mapNotNull { d ->
                    d.toObject(Transaction::class.java)?.copy(id = d.id)
                })
            }
        awaitClose { reg.remove() }
    }

    suspend fun createTransaction(uid: String, input: TransactionInput) {
        col(uid, "transactions").add(input.toMap() + serverStamps()).await()
    }

    suspend fun updateTransaction(uid: String, id: String, input: TransactionInput) {
        col(uid, "transactions").document(id)
            .update(input.toMap() + mapOf("updatedAt" to FieldValue.serverTimestamp()))
            .await()
    }

    suspend fun deleteTransaction(uid: String, id: String) {
        col(uid, "transactions").document(id).delete().await()
    }

    // ---------------------------------------------------------------- Bills --

    fun bills(uid: String): Flow<List<Bill>> = callbackFlow {
        val reg = col(uid, "bills")
            .orderBy("dayOfMonth", Query.Direction.ASCENDING)
            .addSnapshotListener { snap, err ->
                if (err != null) { close(err); return@addSnapshotListener }
                if (snap == null) return@addSnapshotListener
                trySend(snap.documents.mapNotNull { d ->
                    d.toObject(Bill::class.java)?.copy(id = d.id)
                })
            }
        awaitClose { reg.remove() }
    }

    suspend fun createBill(uid: String, input: BillInput) {
        // Create the linked alarm event first so we can store its id.
        val eventId = events.create(uid, billEvent(input))
        col(uid, "bills").add(input.toMap() + mapOf("eventId" to eventId) + serverStamps()).await()
    }

    suspend fun updateBill(uid: String, billId: String, eventId: String, input: BillInput) {
        events.update(uid, eventId, billEvent(input))
        col(uid, "bills").document(billId)
            .update(input.toMap() + mapOf("updatedAt" to FieldValue.serverTimestamp()))
            .await()
    }

    suspend fun deleteBill(uid: String, bill: Bill) {
        if (bill.eventId.isNotBlank()) {
            runCatching { events.delete(uid, bill.eventId) }
        }
        col(uid, "bills").document(bill.id).delete().await()
    }

    /** Records the bill as an expense this month and stamps lastPaidYM. */
    suspend fun markBillPaid(uid: String, bill: Bill) {
        createTransaction(
            uid,
            TransactionInput(
                type = "expense",
                amount = bill.amount,
                walletId = bill.walletId,
                categoryId = bill.categoryId,
                date = Timestamp.now(),
                note = "Bayar ${bill.name}",
            ),
        )
        col(uid, "bills").document(bill.id)
            .update(
                mapOf(
                    "lastPaidYM" to currentYM(),
                    "updatedAt" to FieldValue.serverTimestamp(),
                ),
            )
            .await()
    }

    // ------------------------------------------------------------- Budgets --

    fun budgets(uid: String): Flow<List<Budget>> = callbackFlow {
        val reg = col(uid, "budgets")
            .addSnapshotListener { snap, err ->
                if (err != null) { close(err); return@addSnapshotListener }
                if (snap == null) return@addSnapshotListener
                trySend(snap.documents.mapNotNull { d ->
                    d.toObject(Budget::class.java)?.copy(id = d.id)
                })
            }
        awaitClose { reg.remove() }
    }

    /** Upsert the budget for a category (doc id == categoryId). amount<=0 removes it. */
    suspend fun setBudget(uid: String, categoryId: String, amount: Long) {
        val ref = col(uid, "budgets").document(categoryId)
        if (amount <= 0) {
            ref.delete().await()
            return
        }
        ref.set(
            mapOf(
                "categoryId" to categoryId,
                "amount" to amount,
                "updatedAt" to FieldValue.serverTimestamp(),
            ),
            SetOptions.merge(),
        ).await()
    }

    // -------------------------------------------------------------- Helpers --

    private fun billEvent(input: BillInput): EventInput {
        val start = nextDueDateMillis(input.dayOfMonth)
        return EventInput(
            title = "Tagihan: ${input.name}",
            start = Timestamp(Date(start)),
            end = Timestamp(Date(start + 30 * 60_000L)),
            allDay = false,
            reminderOffsetMinutes = input.reminderOffsetMinutes,
            source = "manual",
            recurrence = "monthly",
            alarmMode = input.alarmMode,
        )
    }

    private fun serverStamps(): Map<String, Any?> = mapOf(
        "createdAt" to FieldValue.serverTimestamp(),
        "updatedAt" to FieldValue.serverTimestamp(),
    )

    private fun WalletInput.toMap(): Map<String, Any?> = mapOf(
        "name" to name,
        "type" to type,
        "initialBalance" to initialBalance,
        "color" to color,
        "archived" to archived,
    )

    private fun TransactionInput.toMap(): Map<String, Any?> = mapOf(
        "type" to type,
        "amount" to amount,
        "walletId" to walletId,
        "toWalletId" to toWalletId,
        "categoryId" to categoryId,
        "date" to date,
        "note" to note,
    )

    private fun BillInput.toMap(): Map<String, Any?> = mapOf(
        "name" to name,
        "amount" to amount,
        "walletId" to walletId,
        "categoryId" to categoryId,
        "dayOfMonth" to dayOfMonth,
        "reminderOffsetMinutes" to reminderOffsetMinutes,
        "alarmMode" to alarmMode,
    )
}
