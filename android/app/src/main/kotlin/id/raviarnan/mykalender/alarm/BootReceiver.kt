package id.raviarnan.mykalender.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import id.raviarnan.mykalender.data.Event

/**
 * Re-schedules upcoming alarms after device reboot or app upgrade. Reads once
 * from Firestore, then schedules. The app itself reschedules on every new
 * Firestore snapshot while running, so this is purely to recover from reboot.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return

        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val scheduler = AlarmScheduler(context.applicationContext)
        val pendingResult = goAsync()

        FirebaseFirestore.getInstance()
            .collection("users").document(uid)
            .collection("events")
            .whereGreaterThanOrEqualTo("start", Timestamp.now())
            .get()
            .addOnSuccessListener { snap ->
                val events = snap.documents.mapNotNull { d ->
                    d.toObject(Event::class.java)?.copy(id = d.id)
                }
                // reconcile() caps the number of alarms so a large calendar can't
                // blow past Android's 500-alarm limit and crash the receiver.
                scheduler.reconcile(emptySet(), events)
                pendingResult.finish()
            }
            .addOnFailureListener { pendingResult.finish() }
    }
}
