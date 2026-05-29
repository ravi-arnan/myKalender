package id.raviarnan.mykalender.ui.money

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import id.raviarnan.mykalender.data.money.TxCategory
import id.raviarnan.mykalender.data.money.formatIDR
import kotlin.math.max

data class TrendPoint(val label: String, val income: Long, val expense: Long)

/** Donut of expense-by-category with a legend; tail collapsed into "Lainnya". */
@Composable
fun SpendingDonut(slices: List<Pair<TxCategory, Long>>) {
    val total = slices.sumOf { it.second }
    if (total <= 0L) return

    val top = 5
    val shown = slices.take(top)
    val restAmount = slices.drop(top).sumOf { it.second }
    val legend = buildList {
        shown.forEach { (cat, amt) -> add(Triple(cat.label, colorFromHex(cat.color), amt)) }
        if (restAmount > 0) add(Triple("Lainnya", Color(0xFF9CA3AF), restAmount))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(0.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Text(
                "Komposisi pengeluaran",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(132.dp), contentAlignment = Alignment.Center) {
                    Canvas(modifier = Modifier.size(132.dp)) {
                        val sw = 24.dp.toPx()
                        val inset = sw / 2
                        var start = -90f
                        legend.forEach { (_, color, amt) ->
                            val sweep = (amt.toFloat() / total) * 360f
                            drawArc(
                                color = color,
                                startAngle = start,
                                sweepAngle = sweep,
                                useCenter = false,
                                topLeft = Offset(inset, inset),
                                size = Size(size.width - sw, size.height - sw),
                                style = Stroke(width = sw),
                            )
                            start += sweep
                        }
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "Total",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            formatIDR(total),
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                    }
                }
                Spacer(Modifier.size(16.dp))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    legend.forEach { (label, color, amt) ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(color),
                            )
                            Spacer(Modifier.size(8.dp))
                            Text(
                                label,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onBackground,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                "${Math.round(amt.toFloat() / total * 100)}%",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

/** Income vs expense over six months as two polylines. */
@Composable
fun TrendChart(trend: List<TrendPoint>) {
    val incomeColor = MaterialTheme.colorScheme.primary
    val expenseColor = MaterialTheme.colorScheme.onBackground
    val maxValue = max(1L, trend.maxOfOrNull { max(it.income, it.expense) } ?: 1L)
    val hasData = trend.any { it.income > 0 || it.expense > 0 }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(0.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Tren 6 bulan",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                )
                LegendDot(incomeColor, "Masuk")
                Spacer(Modifier.size(10.dp))
                LegendDot(expenseColor, "Keluar")
            }
            Spacer(Modifier.height(12.dp))
            if (!hasData) {
                Text(
                    "Belum ada data untuk ditampilkan.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Canvas(modifier = Modifier.fillMaxWidth().height(110.dp)) {
                    val padX = 8.dp.toPx()
                    val padY = 10.dp.toPx()
                    val stepX = (size.width - padX * 2) / max(1, trend.size - 1)
                    fun pt(i: Int, v: Long): Offset {
                        val x = padX + i * stepX
                        val y = padY + (1f - v.toFloat() / maxValue) * (size.height - padY * 2)
                        return Offset(x, y)
                    }
                    fun pathFor(pick: (TrendPoint) -> Long): Path {
                        val p = Path()
                        trend.forEachIndexed { i, tp ->
                            val o = pt(i, pick(tp))
                            if (i == 0) p.moveTo(o.x, o.y) else p.lineTo(o.x, o.y)
                        }
                        return p
                    }
                    drawPath(pathFor { it.income }, color = incomeColor, style = Stroke(width = 2.dp.toPx()))
                    drawPath(pathFor { it.expense }, color = expenseColor, style = Stroke(width = 2.dp.toPx()))
                    trend.forEachIndexed { i, tp ->
                        drawCircle(incomeColor, radius = 3.dp.toPx(), center = pt(i, tp.income))
                        drawCircle(expenseColor, radius = 3.dp.toPx(), center = pt(i, tp.expense))
                    }
                }
                Spacer(Modifier.height(6.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    trend.forEach { tp ->
                        Text(
                            tp.label,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))
        Spacer(Modifier.size(4.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
