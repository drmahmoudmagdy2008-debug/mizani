import { useEffect, useMemo, useState } from 'react'
import { CURRENCIES, DAYS_AR, DEFAULT_CATEGORIES, DEFAULT_WALLETS } from './data'
import {
  addTransaction,
  deleteTransaction,
  exportState,
  importState,
  loadState,
  monthStats,
  saveState,
  totalBalance,
  updateTransaction,
} from './store'
import { formatDate, formatMoney, formatMonthTitle, monthKey, pct, shiftMonth, todayISO, uid } from './utils'
import Auth from './Auth.jsx'
import { api, getToken, setToken } from './api.js'

const TABS = [
  { id: 'home', label: 'الرئيسية', icon: 'home' },
  { id: 'stats', label: 'التقارير', icon: 'pie_chart' },
  { id: 'add', label: 'إضافة', icon: 'add' },
  { id: 'budget', label: 'الميزانية', icon: 'savings' },
  { id: 'more', label: 'المزيد', icon: 'apps' },
]

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function Progress({ value, tone }) {
  return (
    <div className={`progress ${tone || ''}`}>
      <i style={{ width: `${pct(value, 100)}%` }} />
    </div>
  )
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('home')
  const [month, setMonth] = useState(monthKey())
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState(todayISO())
  const [locked, setLocked] = useState(!!loadState().pin)
  const [pinTry, setPinTry] = useState('')
  const [splash, setSplash] = useState(true)
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [syncing, setSyncing] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 900)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    let alive = true
    async function boot() {
      if (!getToken()) {
        if (alive) setAuthReady(true)
        return
      }
      try {
        const me = await api.me()
        if (!alive) return
        setUser(me.user)
        const cloud = await api.getData()
        if (cloud?.payload) {
          setState((s) => ({ ...s, ...cloud.payload, onboarded: true }))
          setSyncing('اتزامنت بياناتك')
        }
      } catch {
        setToken('')
      } finally {
        if (alive) setAuthReady(true)
      }
    }
    boot()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!user || !authReady) return
    const t = setTimeout(() => {
      api.saveData(state).then(() => setSyncing('محفوظ على الحساب')).catch(() => setSyncing('المزامنة فشلت'))
    }, 700)
    return () => clearTimeout(t)
  }, [state, user, authReady])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const catMap = useMemo(
    () => Object.fromEntries(state.categories.map((c) => [c.id, c])),
    [state.categories]
  )
  const walletMap = useMemo(
    () => Object.fromEntries(state.wallets.map((w) => [w.id, w])),
    [state.wallets]
  )
  const stats = useMemo(() => monthStats(state, month), [state, month])
  const balance = totalBalance(state)
  const currency = state.symbol

  function notify(msg) {
    setToast(msg)
  }

  function openAdd(type = 'expense') {
    setSheet({ kind: 'tx', draft: emptyDraft(type) })
  }

  async function handleAuthed(nextUser) {
    setUser(nextUser)
    setShowAuth(false)
    try {
      const cloud = await api.getData()
      if (cloud?.payload) {
        setState((s) => ({ ...s, ...cloud.payload, onboarded: true, name: cloud.payload.name || nextUser.name || s.name }))
        notify('اتزامنت بيانات الحساب')
      } else {
        setState((s) => ({ ...s, onboarded: true, name: s.name || nextUser.name }))
        notify('اتحفظ الحساب')
      }
    } catch {
      notify('الحساب تمام، المزامنة هتكمّل بعد شوية')
    }
  }

  if (splash || !authReady) {
    return (
      <div className="app">
        <div className="splash">
          <div className="logo-mark"><Icon name="account_balance_wallet" /></div>
          <h1 className="h1" style={{ color: '#fff' }}>ميزاني</h1>
          <p>إدارة فلوسك بسهولة</p>
        </div>
      </div>
    )
  }

  if (showAuth || (!user && !state.onboarded && !localStorage.getItem('mizani-skip-auth'))) {
    return (
      <div className="app">
        <Auth
          onSkip={() => {
            localStorage.setItem('mizani-skip-auth', '1')
            setShowAuth(false)
          }}
          onAuthed={handleAuthed}
        />
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  if (!state.onboarded) {
    return (
      <div className="app">
        <Onboard
          onDone={(data) => {
            setState((s) => ({ ...s, ...data, onboarded: true }))
            setLocked(!!data.pin)
          }}
        />
      </div>
    )
  }

  if (locked && state.pin) {
    return (
      <div className="app">
        <LockScreen
          value={pinTry}
          setValue={setPinTry}
          onOk={(code) => {
            if ((code || pinTry) === state.pin) {
              setLocked(false)
              setPinTry('')
            } else {
              setPinTry('')
              notify('الرمز غلط')
            }
          }}
        />
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  return (
    <div className="app">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,1,0" />
      <div className="screen">
        {tab === 'home' && (
          <Home
            state={state}
            stats={stats}
            month={month}
            setMonth={setMonth}
            balance={balance}
            catMap={catMap}
            currency={currency}
            onAdd={openAdd}
            onOpenTx={(tx) => setSheet({ kind: 'tx', draft: { ...tx } })}
          />
        )}
        {tab === 'stats' && (
          <Stats
            state={state}
            stats={stats}
            month={month}
            setMonth={setMonth}
            catMap={catMap}
            currency={currency}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
          />
        )}
        {tab === 'budget' && (
          <BudgetScreen
            state={state}
            setState={setState}
            stats={stats}
            month={month}
            catMap={catMap}
            currency={currency}
            notify={notify}
          />
        )}
        {tab === 'more' && (
          <More
            state={state}
            setState={setState}
            setTab={setTab}
            setSheet={setSheet}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            catMap={catMap}
            walletMap={walletMap}
            currency={currency}
            notify={notify}
            onLock={() => setLocked(true)}
            user={user}
            syncing={syncing}
            onLogin={() => setShowAuth(true)}
            onLogout={() => {
              setToken('')
              setUser(null)
              localStorage.setItem('mizani-skip-auth', '1')
              notify('تم تسجيل الخروج')
            }}
          />
        )}
      </div>

      <nav className="nav">
        {TABS.map((t) =>
          t.id === 'add' ? (
            <button key={t.id} onClick={() => openAdd('expense')} aria-label="إضافة">
              <div className="plus"><Icon name="add" /></div>
            </button>
          ) : (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} />
              {t.label}
            </button>
          )
        )}
      </nav>

      {sheet?.kind === 'tx' && (
        <TxSheet
          state={state}
          draft={sheet.draft}
          onClose={() => setSheet(null)}
          onSave={(draft) => {
            setState((s) => (draft.id ? updateTransaction(s, draft.id, draft) : addTransaction(s, draft)))
            setSheet(null)
            notify(draft.id ? 'تم التعديل' : 'تمت الإضافة')
            setTab('home')
          }}
          onDelete={(id) => {
            setState((s) => deleteTransaction(s, id))
            setSheet(null)
            notify('تم الحذف')
          }}
        />
      )}
      {sheet?.kind === 'wallet' && (
        <WalletSheet
          wallet={sheet.wallet}
          onClose={() => setSheet(null)}
          onSave={(w) => {
            setState((s) => {
              if (w.id && s.wallets.some((x) => x.id === w.id)) {
                return { ...s, wallets: s.wallets.map((x) => (x.id === w.id ? w : x)) }
              }
              return { ...s, wallets: [...s.wallets, { ...w, id: uid(), balance: Number(w.balance || 0) }] }
            })
            setSheet(null)
          }}
        />
      )}
      {sheet?.kind === 'goal' && (
        <GoalSheet
          goal={sheet.goal}
          currency={currency}
          onClose={() => setSheet(null)}
          onSave={(g) => {
            setState((s) => {
              if (g.id && s.goals.some((x) => x.id === g.id)) {
                return { ...s, goals: s.goals.map((x) => (x.id === g.id ? g : x)) }
              }
              return { ...s, goals: [...s.goals, { ...g, id: uid(), saved: Number(g.saved || 0) }] }
            })
            setSheet(null)
          }}
        />
      )}
      {sheet?.kind === 'bill' && (
        <BillSheet
          bill={sheet.bill}
          cats={state.categories.filter((c) => c.type === 'expense')}
          onClose={() => setSheet(null)}
          onSave={(b) => {
            setState((s) => {
              if (b.id && s.bills.some((x) => x.id === b.id)) {
                return { ...s, bills: s.bills.map((x) => (x.id === b.id ? b : x)) }
              }
              return { ...s, bills: [...s.bills, { ...b, id: uid(), paid: false }] }
            })
            setSheet(null)
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function emptyDraft(type) {
  return {
    type,
    amount: '',
    categoryId: type === 'income' ? 'salary' : 'food',
    walletId: 'cash',
    note: '',
    date: todayISO(),
  }
}

function Home({ state, stats, month, setMonth, balance, catMap, currency, onAdd, onOpenTx }) {
  return (
    <div className="stack">
      <div className="between">
        <div>
          <div className="kicker">أهلاً {state.name || 'يا صاحبي'}</div>
          <h1 className="h1">ميزاني</h1>
        </div>
        <button className="icon-btn" onClick={() => onAdd('income')}><Icon name="add_card" /></button>
      </div>

      <div className="month-nav">
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="chevron_right" /></button>
        <b>{formatMonthTitle(month)}</b>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="chevron_left" /></button>
      </div>

      <div className="hero">
        <div className="label">إجمالي رصيدك</div>
        <div className="amount">{formatMoney(balance, currency)}</div>
        <div className="stats3">
          <div className="mini"><span>دخل</span><b>{formatMoney(stats.income, currency)}</b></div>
          <div className="mini"><span>صرف</span><b>{formatMoney(stats.expense, currency)}</b></div>
          <div className="mini"><span>صافي</span><b>{formatMoney(stats.net, currency)}</b></div>
        </div>
      </div>

      <div className="wallets">
        {state.wallets.map((w) => (
          <div key={w.id} className="wallet" style={{ background: w.color }}>
            <div className="row"><Icon name={w.icon} /><span>{w.name}</span></div>
            <b style={{ fontSize: 18, display: 'block', marginTop: 10 }}>{formatMoney(w.balance, currency)}</b>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="between" style={{ marginBottom: 10 }}>
          <h2 className="h2">صرف سريع</h2>
          <button className="chip" onClick={() => onAdd('expense')}>إضافة</button>
        </div>
        <div className="cat-grid">
          {state.categories.filter((c) => c.type === 'expense').slice(0, 8).map((c) => (
            <button key={c.id} className="cat" onClick={() => onAdd('expense')}>
              <div className="ico" style={{ background: c.color }}><Icon name={c.icon} /></div>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <TxList title="آخر العمليات" txs={stats.txs.slice(0, 8)} catMap={catMap} currency={currency} onOpen={onOpenTx} empty="مفيش عمليات الشهر ده" />
    </div>
  )
}

function TxList({ title, txs, catMap, currency, onOpen, empty }) {
  return (
    <div className="card">
      <h2 className="h2" style={{ marginBottom: 6 }}>{title}</h2>
      {txs.length === 0 && <div className="empty">{empty}</div>}
      {txs.map((t) => {
        const c = catMap[t.categoryId] || { name: 'تصنيف', icon: 'receipt', color: '#64748b' }
        return (
          <button key={t.id} className="tx" style={{ width: '100%', border: 0, background: 'transparent', textAlign: 'right' }} onClick={() => onOpen?.(t)}>
            <div className="avatar" style={{ background: c.color }}><Icon name={c.icon} /></div>
            <div style={{ textAlign: 'right' }}>
              <b>{c.name}</b>
              <div className="muted">{formatDate(t.date)}{t.note ? ` · ${t.note}` : ''}</div>
            </div>
            <div className={`amt ${t.type === 'income' ? 'inc' : 'exp'}`}>
              {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount, currency)}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Stats({ state, stats, month, setMonth, catMap, currency, selectedDay, setSelectedDay }) {
  const expenseCats = Object.entries(stats.byCat)
    .map(([id, amount]) => ({ ...catMap[id], amount }))
    .filter((c) => c.type === 'expense' && c.amount)
    .sort((a, b) => b.amount - a.amount)
  const maxDay = Math.max(1, ...Object.values(stats.byDay).map((d) => d.expense))
  const days = Object.keys(stats.byDay).sort().slice(-10)
  const dayTxs = state.transactions.filter((t) => t.date === selectedDay)

  return (
    <div className="stack">
      <div className="between">
        <h1 className="h1">التقارير</h1>
        <span className="pill">{formatMonthTitle(month)}</span>
      </div>
      <div className="month-nav">
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="chevron_right" /></button>
        <b>{formatMonthTitle(month)}</b>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="chevron_left" /></button>
      </div>
      <div className="card">
        <div className="between">
          <div>
            <div className="muted">نسبة الصرف من الدخل</div>
            <b>{stats.income ? Math.round((stats.expense / stats.income) * 100) : 0}%</b>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="muted">المتبقي</div>
            <b>{formatMoney(stats.net, currency)}</b>
          </div>
        </div>
        <div style={{ height: 10 }} />
        <Progress value={stats.income ? (stats.expense / stats.income) * 100 : 0} tone={stats.expense > stats.income ? 'bad' : ''} />
      </div>
      <div className="card">
        <h2 className="h2">صرف الأيام</h2>
        <div className="barwrap" style={{ marginTop: 12 }}>
          {days.length === 0 && <div className="empty">مفيش بيانات</div>}
          {days.map((d) => (
            <div key={d} className="bar" title={d}>
              <i style={{ height: `${pct(stats.byDay[d].expense, maxDay)}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2 className="h2">التصنيفات</h2>
        {expenseCats.length === 0 && <div className="empty">سجل مصاريف عشان يظهر التحليل</div>}
        {expenseCats.map((c) => (
          <div key={c.id} className="list-item">
            <div className="avatar" style={{ background: c.color }}><Icon name={c.icon} /></div>
            <div style={{ flex: 1 }}>
              <div className="between"><b>{c.name}</b><span>{formatMoney(c.amount, currency)}</span></div>
              <Progress value={pct(c.amount, stats.expense)} />
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 className="h2">التقويم</h2>
        <Calendar month={month} selected={selectedDay} onSelect={setSelectedDay} dots={stats.byDay} />
      </div>
      <TxList title={`عمليات ${formatDate(selectedDay)}`} txs={dayTxs} catMap={catMap} currency={currency} empty="مفيش حاجة اليوم ده" />
    </div>
  )
}

function Calendar({ month, selected, onSelect, dots }) {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1).getDay()
  const count = new Date(y, m, 0).getDate()
  const cells = Array.from({ length: first + count }, (_, i) => (i < first ? null : i - first + 1))
  return (
    <div className="cal" style={{ marginTop: 10 }}>
      {DAYS_AR.map((d) => <div key={d} className="hd">{d}</div>)}
      {cells.map((day, i) => {
        if (!day) return <div key={i} />
        const iso = `${month}-${String(day).padStart(2, '0')}`
        const cls = ['day', selected === iso ? 'on' : '', dots[iso] ? 'dot' : ''].join(' ')
        return <button key={iso} className={cls} onClick={() => onSelect(iso)}>{day}</button>
      })}
    </div>
  )
}

function BudgetScreen({ state, setState, stats, month, catMap, currency, notify }) {
  const expenseCats = state.categories.filter((c) => c.type === 'expense')
  function setBudget(categoryId, amount) {
    setState((s) => {
      const rest = s.budgets.filter((b) => !(b.month === month && b.categoryId === categoryId))
      return { ...s, budgets: [...rest, { id: uid(), month, categoryId, amount: Number(amount) || 0 }] }
    })
  }
  const totalBudget = state.budgets.filter((b) => b.month === month).reduce((s, b) => s + b.amount, 0)
  return (
    <div className="stack">
      <h1 className="h1">الميزانية والأهداف</h1>
      <div className="card">
        <div className="between">
          <div>
            <div className="muted">ميزانية {formatMonthTitle(month)}</div>
            <b>{formatMoney(totalBudget, currency)}</b>
          </div>
          <span className={stats.expense > totalBudget && totalBudget ? 'pill bad' : 'pill'}>
            صرف {formatMoney(stats.expense, currency)}
          </span>
        </div>
        <div style={{ height: 8 }} />
        <Progress value={pct(stats.expense, totalBudget || 1) * (totalBudget ? 1 : 0)} tone={stats.expense > totalBudget ? 'bad' : ''} />
      </div>
      <div className="card">
        <h2 className="h2">حدود التصنيفات</h2>
        {expenseCats.map((c) => {
          const b = state.budgets.find((x) => x.month === month && x.categoryId === c.id)
          const spent = stats.byCat[c.id] || 0
          const limit = b?.amount || 0
          return (
            <div key={c.id} className="list-item">
              <div className="avatar" style={{ background: c.color }}><Icon name={c.icon} /></div>
              <div style={{ flex: 1 }}>
                <div className="between"><b>{c.name}</b><span className="muted">{formatMoney(spent, currency)} / {formatMoney(limit, currency)}</span></div>
                <Progress value={pct(spent, limit || 1) * (limit ? 1 : 0)} tone={spent > limit && limit ? 'bad' : spent > limit * 0.8 && limit ? 'warn' : ''} />
                <input
                  style={{ marginTop: 8 }}
                  type="number"
                  placeholder="حط حد للتصنيف"
                  defaultValue={limit || ''}
                  onBlur={(e) => setBudget(c.id, e.target.value)}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="card">
        <div className="between">
          <h2 className="h2">أهداف الادخار</h2>
          <button className="chip active" onClick={() => setState((s) => ({
            ...s,
            goals: [...s.goals, { id: uid(), name: 'هدف جديد', target: 5000, saved: 0, date: '' }],
          }))}>+ هدف</button>
        </div>
        {state.goals.length === 0 && <div className="empty">حط هدف زي رحلة أو جهاز جديد</div>}
        {state.goals.map((g) => (
          <div key={g.id} className="list-item">
            <div className="avatar" style={{ background: '#0f766e' }}><Icon name="flag" /></div>
            <div style={{ flex: 1 }}>
              <input value={g.name} onChange={(e) => setState((s) => ({ ...s, goals: s.goals.map((x) => x.id === g.id ? { ...x, name: e.target.value } : x) }))} />
              <div className="row" style={{ marginTop: 8 }}>
                <input type="number" value={g.saved} onChange={(e) => setState((s) => ({ ...s, goals: s.goals.map((x) => x.id === g.id ? { ...x, saved: Number(e.target.value) } : x) }))} />
                <input type="number" value={g.target} onChange={(e) => setState((s) => ({ ...s, goals: s.goals.map((x) => x.id === g.id ? { ...x, target: Number(e.target.value) } : x) }))} />
              </div>
              <div className="muted" style={{ margin: '6px 0' }}>{formatMoney(g.saved, currency)} من {formatMoney(g.target, currency)}</div>
              <Progress value={pct(g.saved, g.target)} />
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="between">
          <h2 className="h2">فواتير ومتكرر</h2>
          <button className="chip active" onClick={() => setState((s) => ({
            ...s,
            bills: [...s.bills, { id: uid(), name: 'فاتورة', amount: 0, categoryId: 'bills', due: todayISO(), paid: false }],
          }))}>+ فاتورة</button>
        </div>
        {state.bills.length === 0 && <div className="empty">سجل الإيجار أو النت أو أي التزام</div>}
        {state.bills.map((b) => (
          <div key={b.id} className="list-item">
            <button
              className="avatar"
              style={{ background: b.paid ? '#10b981' : '#f59e0b', border: 0, color: '#fff' }}
              onClick={() => {
                setState((s) => ({ ...s, bills: s.bills.map((x) => x.id === b.id ? { ...x, paid: !x.paid } : x) }))
                notify(b.paid ? 'اتلغى الدفع' : 'تم الدفع')
              }}
            >
              <Icon name={b.paid ? 'check' : 'schedule'} />
            </button>
            <div style={{ flex: 1 }}>
              <input value={b.name} onChange={(e) => setState((s) => ({ ...s, bills: s.bills.map((x) => x.id === b.id ? { ...x, name: e.target.value } : x) }))} />
              <div className="row" style={{ marginTop: 8 }}>
                <input type="number" value={b.amount} onChange={(e) => setState((s) => ({ ...s, bills: s.bills.map((x) => x.id === b.id ? { ...x, amount: Number(e.target.value) } : x) }))} />
                <input type="date" value={b.due} onChange={(e) => setState((s) => ({ ...s, bills: s.bills.map((x) => x.id === b.id ? { ...x, due: e.target.value } : x) }))} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function More({ state, setState, setSheet, query, setQuery, filter, setFilter, catMap, currency, notify, onLock, user, syncing, onLogin, onLogout }) {
  const txs = state.transactions.filter((t) => {
    const cat = catMap[t.categoryId]
    const q = query.trim()
    const hit = !q || t.note.includes(q) || cat?.name.includes(q)
    const f = filter === 'all' || t.type === filter
    return hit && f
  })
  return (
    <div className="stack">
      <h1 className="h1">المزيد</h1>
      <div className="search">
        <Icon name="search" />
        <input placeholder="دور على عملية أو تصنيف" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="row">
        {['all', 'expense', 'income'].map((f) => (
          <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'الكل' : f === 'expense' ? 'صرف' : 'دخل'}
          </button>
        ))}
      </div>
      <TxList title="كل العمليات" txs={txs.slice(0, 40)} catMap={catMap} currency={currency} onOpen={(tx) => setSheet({ kind: 'tx', draft: { ...tx } })} empty="مفيش نتائج" />

      <div className="card">
        <h2 className="h2">المحافظ</h2>
        {state.wallets.map((w) => (
          <div key={w.id} className="list-item">
            <div className="avatar" style={{ background: w.color }}><Icon name={w.icon} /></div>
            <div style={{ flex: 1 }}>
              <b>{w.name}</b>
              <div className="muted">{formatMoney(w.balance, currency)}</div>
            </div>
          </div>
        ))}
        <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setState((s) => ({
          ...s,
          wallets: [...s.wallets, { id: uid(), name: 'محفظة جديدة', icon: 'account_balance_wallet', color: '#6366f1', balance: 0 }],
        }))}>إضافة محفظة</button>
      </div>

      <div className="card account-card">
        <div className="kicker">الحساب</div>
        {user ? (
          <>
            <div className="about-hero">
              {user.picture ? <img className="account-pic" src={user.picture} alt="" /> : <div className="about-avatar"><Icon name="person" /></div>}
              <div>
                <h2 className="h2">{user.name}</h2>
                <div className="muted">{user.email}</div>
              </div>
            </div>
            <div className="pill">{syncing || 'متصل بالحساب'}</div>
            <button className="btn ghost" onClick={onLogout}>تسجيل الخروج</button>
          </>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>سجّل دخول عشان ميزانيتك تتحفظ وتتزامن على السيرفر.</p>
            <button className="btn primary" onClick={onLogin}>تسجيل الدخول / حساب جديد</button>
          </>
        )}
      </div>

      <div className="card stack">
        <h2 className="h2">الإعدادات</h2>
        <label>اسمك</label>
        <input value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} />
        <label>العملة</label>
        <select
          value={state.currency}
          onChange={(e) => {
            const c = CURRENCIES.find((x) => x.code === e.target.value)
            setState((s) => ({ ...s, currency: c.code, symbol: c.symbol }))
          }}
        >
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>)}
        </select>
        <label>رمز القفل</label>
        <input
          inputMode="numeric"
          maxLength={4}
          placeholder="4 أرقام"
          value={state.pin}
          onChange={(e) => setState((s) => ({ ...s, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
        />
        {state.pin && <button className="btn ghost" onClick={onLock}>قفل التطبيق</button>}
        <button
          className="btn ghost"
          onClick={() => {
            const blob = new Blob([exportState(state)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'mizani-backup.json'
            a.click()
            notify('تم تصدير النسخة')
          }}
        >تصدير نسخة احتياطية</button>
        <label className="btn ghost" style={{ textAlign: 'center' }}>
          استيراد نسخة
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                try {
                  setState(importState(String(reader.result)))
                  notify('تم الاستيراد')
                } catch {
                  notify('الملف مش صالح')
                }
              }
              reader.readAsText(file)
            }}
          />
        </label>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('هتمسح كل البيانات؟')) {
              localStorage.removeItem('mizani-v1')
              setState({
                onboarded: true,
                name: state.name,
                currency: state.currency,
                symbol: state.symbol,
                pin: '',
                locked: false,
                theme: 'light',
                categories: DEFAULT_CATEGORIES,
                wallets: DEFAULT_WALLETS.map((w) => ({ ...w })),
                transactions: [],
                budgets: [],
                goals: [],
                bills: [],
              })
              notify('اتمسحت البيانات')
            }
          }}
        >مسح البيانات</button>
      </div>

      <div className="card about-card">
        <div className="kicker">حول التطبيق</div>
        <div className="about-hero">
          <div className="about-avatar"><Icon name="palette" /></div>
          <div>
            <h2 className="h2">ميزاني</h2>
            <div className="muted">تطبيق إدارة الميزانية الشخصية</div>
          </div>
        </div>
        <p className="about-text">تصميم وتطوير محمود مجدي. تطبيق بسيط يساعدك تدير دخلك وصرفك وميزانية الشهر من غير تعقيد.</p>
        <a className="about-mail" href="mailto:hodatras9@gmail.com">
          <Icon name="mail" />
          <span>
            <b>للتواصل</b>
            <small>hodatras9@gmail.com</small>
          </span>
        </a>
        <div className="muted" style={{ textAlign: 'center' }}>الإصدار 1.0.0</div>
      </div>
    </div>
  )
}

function TxSheet({ state, draft, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(draft)
  const cats = state.categories.filter((c) => c.type === form.type)
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }
  return (
    <div className="sheet" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <h2 className="h2">{form.id ? 'تعديل عملية' : 'عملية جديدة'}</h2>
        <div className="seg" style={{ margin: '12px 0' }}>
          <button className={form.type === 'expense' ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, type: 'expense', categoryId: 'food' }))}>صرف</button>
          <button className={form.type === 'income' ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, type: 'income', categoryId: 'salary' }))}>دخل</button>
        </div>
        <div className="stack">
          <div>
            <label>المبلغ</label>
            <input inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label>التصنيف</label>
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>المحفظة</label>
            <select value={form.walletId} onChange={(e) => set('walletId', e.target.value)}>
              {state.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label>التاريخ</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label>ملاحظة</label>
            <textarea value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="اختياري" />
          </div>
          <button className="btn primary" onClick={() => Number(form.amount) > 0 && onSave(form)}>حفظ</button>
          {form.id && <button className="btn danger" onClick={() => onDelete(form.id)}>حذف</button>}
        </div>
      </div>
    </div>
  )
}

function WalletSheet() { return null }
function GoalSheet() { return null }
function BillSheet() { return null }

function Onboard({ onDone }) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('EGP')
  const [balance, setBalance] = useState('')
  const cur = CURRENCIES.find((c) => c.code === currency)
  return (
    <div className="onboard">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,1,0" />
      <div className="white stack">
        <div className="logo-mark" style={{ background: '#ecfdf5', color: '#0f766e' }}><Icon name="account_balance_wallet" /></div>
        <h1 className="h1">أهلاً بيك في ميزاني</h1>
        <p className="muted">تطبيق بسيط يدير دخلك وصرفك وميزانية الشهر من غير تعقيد.</p>
        <div>
          <label>اسمك</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً أحمد" />
        </div>
        <div>
          <label>العملة</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label>رصيد الكاش الحالي</label>
          <input inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="اختياري" />
        </div>
        <button
          className="btn primary"
          onClick={() => onDone({
            name: name || 'صاحب الميزانية',
            currency: cur.code,
            symbol: cur.symbol,
            wallets: loadState().wallets.map((w) => w.id === 'cash' ? { ...w, balance: Number(balance || 0) } : w),
          })}
        >ابدأ دلوقتي</button>
      </div>
    </div>
  )
}

function LockScreen({ value, setValue, onOk }) {
  function press(n) {
    const next = (value + n).slice(0, 4)
    setValue(next)
    if (next.length === 4) setTimeout(() => onOk(next), 80)
  }
  return (
    <div className="lock">
      <div>
        <div className="logo-mark"><Icon name="lock" /></div>
        <h1 className="h1" style={{ color: '#fff' }}>أدخل الرمز</h1>
        <div className="row" style={{ justifyContent: 'center', margin: '16px 0' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 99, background: value.length > i ? '#fff' : 'rgba(255,255,255,.35)' }} />
          ))}
        </div>
        <div className="numpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((n) => (
            <button
              key={n || 'x'}
              style={{ visibility: n ? 'visible' : 'hidden', background: 'rgba(255,255,255,.12)', color: '#fff' }}
              onClick={() => (n === '⌫' ? setValue(value.slice(0, -1)) : press(n))}
            >{n}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
