package id.raviarnan.mykalender

import android.accounts.Account
import android.app.Application
import android.content.Intent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.UserRecoverableAuthException
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.firebase.auth.FirebaseAuth
import id.raviarnan.mykalender.data.ConnectedAccount
import id.raviarnan.mykalender.data.ConnectedAccountsRepository
import id.raviarnan.mykalender.gcal.GcalSyncRepository
import id.raviarnan.mykalender.gcal.GoogleCalendar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

data class AccountMessage(val ok: Boolean, val text: String)

data class AccountsUiState(
    val accounts: List<ConnectedAccount> = emptyList(),
    val adding: Boolean = false,
    val busyEmail: String? = null,
    val message: AccountMessage? = null,
)

/**
 * Drives the Accounts tab: connecting additional Google accounts, syncing their
 * calendars into Firestore, and disconnecting them. Mirrors the web Accounts
 * page (accounts.tsx).
 */
class AccountsViewModel(application: Application) : AndroidViewModel(application) {

    private val auth = FirebaseAuth.getInstance()
    private val accountsRepo = ConnectedAccountsRepository()
    private val syncRepo = GcalSyncRepository()

    private val _ui = MutableStateFlow(AccountsUiState())
    val ui: StateFlow<AccountsUiState> = _ui.asStateFlow()

    private var uid: String? = null
    private var subscription: Job? = null

    fun start(uid: String) {
        if (this.uid == uid && subscription != null) return
        this.uid = uid
        subscription?.cancel()
        subscription = viewModelScope.launch {
            accountsRepo.subscribe(uid).collectLatest { list ->
                _ui.value = _ui.value.copy(accounts = list.sortedBy { it.email })
            }
        }
    }

    fun clearMessage() {
        _ui.value = _ui.value.copy(message = null)
    }

    /** Called with the result Intent from the GoogleSignIn account picker. */
    fun onAddAccountResult(data: Intent?) {
        val uid = uid ?: return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(adding = true, message = null)
            try {
                val acct = GoogleSignIn.getSignedInAccountFromIntent(data).await()
                val email = acct.email
                    ?: throw IllegalStateException("Email akun tidak tersedia")
                if (email.equals(auth.currentUser?.email, ignoreCase = true)) {
                    _ui.value = _ui.value.copy(
                        adding = false,
                        message = AccountMessage(false, "Akun itu sudah jadi akun utama. Pilih akun lain."),
                    )
                    return@launch
                }
                accountsRepo.upsert(uid, email, acct.displayName, acct.photoUrl?.toString())
                val androidAccount = acct.account ?: Account(email, GOOGLE_ACCOUNT_TYPE)
                val token = withContext(Dispatchers.IO) {
                    GoogleAuthUtil.getToken(getApplication(), androidAccount, GoogleCalendar.TOKEN_SCOPE)
                }
                val result = syncRepo.syncAccount(uid, token, email, DAYS_ADD)
                accountsRepo.markSynced(uid, email)
                _ui.value = _ui.value.copy(
                    adding = false,
                    message = AccountMessage(true, "$email terhubung. ${result.imported} jadwal di-import."),
                )
            } catch (e: UserRecoverableAuthException) {
                _ui.value = _ui.value.copy(
                    adding = false,
                    message = AccountMessage(false, "Izin kalender diperlukan. Coba sambungkan lagi."),
                )
            } catch (t: Throwable) {
                _ui.value = _ui.value.copy(
                    adding = false,
                    message = AccountMessage(false, t.message ?: "Gagal menambah akun"),
                )
            }
        }
    }

    fun syncAccount(account: ConnectedAccount) {
        val uid = uid ?: return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busyEmail = account.email, message = null)
            try {
                val token = withContext(Dispatchers.IO) {
                    GoogleAuthUtil.getToken(
                        getApplication(),
                        Account(account.email, GOOGLE_ACCOUNT_TYPE),
                        GoogleCalendar.TOKEN_SCOPE,
                    )
                }
                val result = syncRepo.syncAccount(uid, token, account.email, DAYS_RESYNC)
                accountsRepo.markSynced(uid, account.email)
                _ui.value = _ui.value.copy(
                    busyEmail = null,
                    message = AccountMessage(true, "${account.email}: ${result.imported} jadwal di-import."),
                )
            } catch (e: UserRecoverableAuthException) {
                _ui.value = _ui.value.copy(
                    busyEmail = null,
                    message = AccountMessage(false, "Perlu izin lagi untuk ${account.email}. Sambungkan ulang akun ini."),
                )
            } catch (t: Throwable) {
                _ui.value = _ui.value.copy(
                    busyEmail = null,
                    message = AccountMessage(false, t.message ?: "Sync gagal"),
                )
            }
        }
    }

    fun disconnect(account: ConnectedAccount) {
        val uid = uid ?: return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busyEmail = account.email, message = null)
            try {
                accountsRepo.disconnect(uid, account.email)
                _ui.value = _ui.value.copy(
                    busyEmail = null,
                    message = AccountMessage(true, "${account.email} terputus."),
                )
            } catch (t: Throwable) {
                _ui.value = _ui.value.copy(
                    busyEmail = null,
                    message = AccountMessage(false, t.message ?: "Gagal memutus akun"),
                )
            }
        }
    }

    companion object {
        private const val GOOGLE_ACCOUNT_TYPE = "com.google"
        private const val DAYS_ADD = 365
        private const val DAYS_RESYNC = 30
    }
}
