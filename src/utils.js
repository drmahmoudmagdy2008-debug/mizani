import { MONTHS_AR } from './data'

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function monthKey(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatMoney(n, symbol = 'ج.م') {
  const num = Number(n) || 0
  const abs = Math.abs(num)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} ${symbol}`
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDate()
  const month = MONTHS_AR[d.getMonth()]
  return `${day} ${month}`
}

export function formatMonthTitle(key) {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_AR[m - 1]} ${y}`
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}

export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function startWeekday(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).getDay()
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function pct(part, total) {
  if (!total) return 0
  return clamp((part / total) * 100, 0, 100)
}
