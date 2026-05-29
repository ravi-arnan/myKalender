package id.raviarnan.mykalender

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import id.raviarnan.mykalender.data.money.Bill
import id.raviarnan.mykalender.data.money.BillInput
import id.raviarnan.mykalender.data.money.Budget
import id.raviarnan.mykalender.data.money.MoneyRepository
import id.raviarnan.mykalender.data.money.Transaction
import id.raviarnan.mykalender.data.money.TransactionInput
import id.raviarnan.mykalender.data.money.Wallet
import id.raviarnan.mykalender.data.money.WalletInput
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MoneyUiState(
    val wallets: List<Wallet> = emptyList(),
    val transactions: List<Transaction> = emptyList(),
    val bills: List<Bill> = emptyList(),
    val budgets: List<Budget> = emptyList(),
    val walletsLoaded: Boolean = false,
    val txLoaded: Boolean = false,
    val error: String? = null,
) {
    val loaded: Boolean get() = walletsLoaded && txLoaded
}

class MoneyViewModel(application: Application) : AndroidViewModel(application) {

    private val repo = MoneyRepository()

    private val _state = MutableStateFlow(MoneyUiState())
    val state: StateFlow<MoneyUiState> = _state.asStateFlow()

    private var uid: String? = null
    private val jobs = mutableListOf<Job>()

    /** Begin (or re-target) realtime streams for the signed-in user. */
    fun start(uid: String) {
        if (this.uid == uid) return
        this.uid = uid
        jobs.forEach { it.cancel() }
        jobs.clear()
        _state.value = MoneyUiState()
        jobs += viewModelScope.launch {
            repo.wallets(uid).collectLatest { list ->
                _state.update { it.copy(wallets = list, walletsLoaded = true) }
            }
        }
        jobs += viewModelScope.launch {
            repo.transactions(uid).collectLatest { list ->
                _state.update { it.copy(transactions = list, txLoaded = true) }
            }
        }
        jobs += viewModelScope.launch {
            repo.bills(uid).collectLatest { list ->
                _state.update { it.copy(bills = list) }
            }
        }
        jobs += viewModelScope.launch {
            repo.budgets(uid).collectLatest { list ->
                _state.update { it.copy(budgets = list) }
            }
        }
    }

    private fun run(block: suspend (uid: String) -> Unit) {
        val u = uid ?: return
        viewModelScope.launch {
            try {
                block(u)
            } catch (t: Throwable) {
                _state.update { it.copy(error = t.message ?: "Terjadi kesalahan") }
            }
        }
    }

    // Wallets
    fun saveWallet(existing: Wallet?, input: WalletInput) = run { uid ->
        if (existing == null) repo.createWallet(uid, input)
        else repo.updateWallet(uid, existing.id, input)
    }
    fun deleteWallet(id: String) = run { uid -> repo.deleteWallet(uid, id) }

    // Transactions
    fun saveTransaction(existing: Transaction?, input: TransactionInput) = run { uid ->
        if (existing == null) repo.createTransaction(uid, input)
        else repo.updateTransaction(uid, existing.id, input)
    }
    fun deleteTransaction(id: String) = run { uid -> repo.deleteTransaction(uid, id) }

    // Bills
    fun saveBill(existing: Bill?, input: BillInput) = run { uid ->
        if (existing == null) repo.createBill(uid, input)
        else repo.updateBill(uid, existing.id, existing.eventId, input)
    }
    fun deleteBill(bill: Bill) = run { uid -> repo.deleteBill(uid, bill) }
    fun markBillPaid(bill: Bill) = run { uid -> repo.markBillPaid(uid, bill) }

    // Budgets
    fun setBudget(categoryId: String, amount: Long) = run { uid ->
        repo.setBudget(uid, categoryId, amount)
    }
}
