package id.raviarnan.mykalender.ui.theme

import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

enum class ThemePreference(val key: String) {
    Light("light"),
    Dark("dark"),
    System("system");

    companion object {
        fun fromKey(key: String?): ThemePreference = when (key) {
            "light" -> Light
            "dark" -> Dark
            else -> System
        }
    }
}

private const val PREFS_NAME = "mykalender_prefs"
private const val THEME_KEY = "theme_preference"

class ThemeManager(context: Context) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun get(): ThemePreference = ThemePreference.fromKey(prefs.getString(THEME_KEY, null))

    fun set(preference: ThemePreference) {
        prefs.edit().putString(THEME_KEY, preference.key).apply()
        // Best-effort cross-device sync.
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        FirebaseFirestore.getInstance()
            .collection("users")
            .document(uid)
            .set(mapOf("theme" to preference.key), SetOptions.merge())
            .addOnFailureListener { /* local copy is still saved */ }
    }

    fun observe(): Flow<ThemePreference> = callbackFlow {
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (key == THEME_KEY) trySend(get())
        }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        trySend(get())
        awaitClose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }

    /**
     * Reads the user's theme from Firestore (if set) and applies locally. Call
     * once after sign-in to pick up a preference set on another device.
     */
    suspend fun hydrateFromFirestore() {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        try {
            val snap = FirebaseFirestore.getInstance()
                .collection("users")
                .document(uid)
                .get()
                .await()
            val remoteKey = snap.getString("theme") ?: return
            val remote = ThemePreference.fromKey(remoteKey)
            if (remote != get()) {
                prefs.edit().putString(THEME_KEY, remote.key).apply()
            }
        } catch (_: Exception) {
            // ignore — local copy stays
        }
    }
}
