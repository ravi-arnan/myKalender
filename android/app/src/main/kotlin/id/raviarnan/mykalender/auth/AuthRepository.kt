package id.raviarnan.mykalender.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class AuthRepository(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
) {

    val currentUser: FirebaseUser? get() = auth.currentUser

    fun userFlow(): Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { trySend(it.currentUser) }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    /**
     * Triggers the Credential Manager bottom sheet for Google sign-in, then
     * exchanges the Google ID token for a Firebase credential.
     */
    suspend fun signInWithGoogle(context: Context) {
        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(WEB_CLIENT_ID)
            .setFilterByAuthorizedAccounts(false)
            .setAutoSelectEnabled(false)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val credentialManager = CredentialManager.create(context)
        val result = credentialManager.getCredential(context, request)
        val credential = result.credential
        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
        val firebaseCredential = GoogleAuthProvider.getCredential(
            googleIdTokenCredential.idToken,
            null,
        )
        auth.signInWithCredential(firebaseCredential).await()
    }

    suspend fun signOut(context: Context) {
        auth.signOut()
        runCatching {
            CredentialManager.create(context).clearCredentialState(
                androidx.credentials.ClearCredentialStateRequest()
            )
        }
    }

    companion object {
        // Web client OAuth client ID from google-services.json (oauth_client entry, client_type 3).
        // This is correct: Credential Manager uses the WEB client ID as the audience.
        private const val WEB_CLIENT_ID =
            "335438803237-f5j7scbeqm3u2vfl24hhmbmhckjf0bbq.apps.googleusercontent.com"
    }
}
