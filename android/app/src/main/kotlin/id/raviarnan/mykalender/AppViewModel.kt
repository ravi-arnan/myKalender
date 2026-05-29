package id.raviarnan.mykalender

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import id.raviarnan.mykalender.alarm.AlarmScheduler
import id.raviarnan.mykalender.auth.AuthRepository
import id.raviarnan.mykalender.data.Event
import id.raviarnan.mykalender.data.EventInput
import id.raviarnan.mykalender.data.EventRepository
import id.raviarnan.mykalender.notifications.EventNotifications
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class AppUiState(
    val user: FirebaseUser? = null,
    val events: List<Event> = emptyList(),
    val signingIn: Boolean = false,
    val error: String? = null,
    val saving: Boolean = false,
)

class AppViewModel(application: Application) : AndroidViewModel(application) {

    private val authRepo = AuthRepository()
    private val eventsRepo = EventRepository()
    private val scheduler = AlarmScheduler(application)

    private val _uiState = MutableStateFlow(AppUiState(user = authRepo.currentUser))
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    private var eventsJob: Job? = null
    private var lastScheduledIds: Set<String> = emptySet()
    private val seenEventIds: MutableSet<String> = mutableSetOf()
    private var firstSnapshot: Boolean = true

    init {
        viewModelScope.launch {
            authRepo.userFlow().collectLatest { user ->
                _uiState.value = _uiState.value.copy(user = user, error = null)
                if (user != null) startEventStream(user.uid) else stopEventStream()
            }
        }
    }

    private fun startEventStream(uid: String) {
        eventsJob?.cancel()
        firstSnapshot = true
        seenEventIds.clear()
        eventsJob = viewModelScope.launch {
            eventsRepo.upcomingEvents(uid).collectLatest { events ->
                _uiState.value = _uiState.value.copy(events = events)
                scheduler.reconcile(lastScheduledIds, events)
                lastScheduledIds = events.map { it.id }.toSet()

                if (firstSnapshot) {
                    firstSnapshot = false
                    for (e in events) seenEventIds.add(e.id)
                } else {
                    val now = System.currentTimeMillis()
                    for (e in events) {
                        if (seenEventIds.contains(e.id)) continue
                        seenEventIds.add(e.id)
                        // Only surface notifications for events that were created
                        // very recently — otherwise we'd spam on every paginated
                        // batch from Firestore. 60s window is generous.
                        val createdMs = e.createdAt?.toDate()?.time ?: 0L
                        if (now - createdMs < 60_000L && e.source != "gcal-holiday") {
                            EventNotifications.postNewEvent(
                                getApplication(),
                                e.id,
                                e.title,
                            )
                        }
                    }
                }
            }
        }
    }

    private fun stopEventStream() {
        eventsJob?.cancel()
        eventsJob = null
        for (id in lastScheduledIds) scheduler.cancel(id)
        lastScheduledIds = emptySet()
        _uiState.value = _uiState.value.copy(events = emptyList())
    }

    fun signIn(context: Context) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(signingIn = true, error = null)
            try {
                authRepo.signInWithGoogle(context)
                _uiState.value = _uiState.value.copy(signingIn = false)
            } catch (t: Throwable) {
                _uiState.value = _uiState.value.copy(
                    signingIn = false,
                    error = t.message ?: "Sign-in gagal",
                )
            }
        }
    }

    fun signOut(context: Context) {
        viewModelScope.launch { authRepo.signOut(context) }
    }

    fun saveEvent(existing: Event?, input: EventInput, onDone: () -> Unit) {
        val uid = _uiState.value.user?.uid ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(saving = true, error = null)
            try {
                if (existing == null) eventsRepo.create(uid, input)
                else eventsRepo.update(uid, existing.id, input)
                _uiState.value = _uiState.value.copy(saving = false)
                onDone()
            } catch (t: Throwable) {
                _uiState.value = _uiState.value.copy(
                    saving = false,
                    error = t.message ?: "Gagal menyimpan",
                )
            }
        }
    }

    fun deleteEvent(eventId: String, onDone: () -> Unit) {
        val uid = _uiState.value.user?.uid ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(saving = true, error = null)
            try {
                eventsRepo.delete(uid, eventId)
                _uiState.value = _uiState.value.copy(saving = false)
                onDone()
            } catch (t: Throwable) {
                _uiState.value = _uiState.value.copy(
                    saving = false,
                    error = t.message ?: "Gagal menghapus",
                )
            }
        }
    }
}
