import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from './data'
import { uid, todayISO, monthKey } from './utils'

const KEY = 'mizani-v1'

const defaultState = {
  onboarded: false,
  name: '',
  currency: 'EGP',
  symbol: 'ج.م',
  pin: '',
  locked: false,
  theme: 'light',
  categories: DEFAULT_CATEGORIES,
  wallets: DEFAULT_WALLETS,
  transactions: [],
  budgets: [],
  goals: [],
  bills: [],
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaultState }
    const parsed = JSON.parse(raw)
    return { ...defaultState, ...parsed }
  } catch {
    return { ...defaultState }
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function exportState(state) {
  return JSON.stringify(state, null, 2)
}

export function importState(text) {
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid')
  return { ...defaultState, ...parsed, locked: false }
}

export function addTransaction(state, payload) {
  const tx = {
    id: uid(),
    type: payload.type,
    amount: Number(payload.amount),
    categoryId: payload.categoryId,
    walletId: payload.walletId,
    note: payload.note || '',
    date: payload.date || todayISO(),
    createdAt: Date.now(),
  }
  const wallets = state.wallets.map((w) => {
    if (w.id !== tx.walletId) return w
    const delta = tx.type === 'income' ? tx.amount : -tx.amount
    return { ...w, balance: Number(w.balance) + delta }
  })
  return { ...state, transactions: [tx, ...state.transactions], wallets }
}

export function updateTransaction(state, id, payload) {
  const old = state.transactions.find((t) => t.id === id)
  if (!old) return state
  let wallets = state.wallets.map((w) => {
    if (w.id !== old.walletId) return w
    const delta = old.type === 'income' ? -old.amount : old.amount
    return { ...w, balance: Number(w.balance) + delta }
  })
  const next = {
    ...old,
    ...payload,
    amount: Number(payload.amount),
  }
  wallets = wallets.map((w) => {
    if (w.id !== next.walletId) return w
    const delta = next.type === 'income' ? next.amount : -next.amount
    return { ...w, balance: Number(w.balance) + delta }
  })
  return {
    ...state,
    wallets,
    transactions: state.transactions.map((t) => (t.id === id ? next : t)),
  }
}

export function deleteTransaction(state, id) {
  const old = state.transactions.find((t) => t.id === id)
  if (!old) return state
  const wallets = state.wallets.map((w) => {
    if (w.id !== old.walletId) return w
    const delta = old.type === 'income' ? -old.amount : old.amount
    return { ...w, balance: Number(w.balance) + delta }
  })
  return {
    ...state,
    wallets,
    transactions: state.transactions.filter((t) => t.id !== id),
  }
}

export function monthStats(state, key) {
  const txs = state.transactions.filter((t) => monthKey(t.date) === key)
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const byCat = {}
  txs.forEach((t) => {
    if (!byCat[t.categoryId]) byCat[t.categoryId] = 0
    byCat[t.categoryId] += t.amount
  })
  const byDay = {}
  txs.forEach((t) => {
    if (!byDay[t.date]) byDay[t.date] = { income: 0, expense: 0 }
    byDay[t.date][t.type] += t.amount
  })
  return { txs, income, expense, net: income - expense, byCat, byDay }
}

export function totalBalance(state) {
  return state.wallets.reduce((s, w) => s + Number(w.balance || 0), 0)
}
