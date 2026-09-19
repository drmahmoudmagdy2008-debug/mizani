import { useEffect, useRef, useState } from 'react'
import { api, setToken } from './api'

function Icon({ name }) {
  return <span className="material-symbols-outlined">{name}</span>
}

export default function Auth({ onSkip, onAuthed }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleId, setGoogleId] = useState('')
  const googleBox = useRef(null)

  useEffect(() => {
    api.config().then((c) => setGoogleId(c.googleClientId || '')).catch(() => {})
  }, [])

  const onAuthedRef = useRef(onAuthed)
  onAuthedRef.current = onAuthed

  useEffect(() => {
    if (!googleId) return
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (!googleBox.current || !window.google?.accounts?.id) {
        if (tries > 40) clearInterval(timer)
        return
      }
      clearInterval(timer)
      window.google.accounts.id.initialize({
        client_id: googleId,
        callback: async ({ credential }) => {
          try {
            setBusy(true)
            setError('')
            const data = await api.google(credential)
            setToken(data.token)
            onAuthedRef.current(data.user)
          } catch (e) {
            setError(e.message)
          } finally {
            setBusy(false)
          }
        },
        ux_mode: 'popup',
      })
      googleBox.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleBox.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        locale: 'ar',
      })
    }, 200)
    return () => clearInterval(timer)
  }, [googleId])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = mode === 'register'
        ? await api.register({ name, email, password })
        : await api.login({ email, password })
      setToken(data.token)
      onAuthed(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onboard">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,1,0" />
      <div className="white stack">
        <div className="logo-mark" style={{ background: '#ecfdf5', color: '#0f766e' }}>
          <Icon name="account_circle" />
        </div>
        <h1 className="h1">حسابك على ميزاني</h1>
        <p className="muted">سجّل عشان بياناتك تتحفظ على السيرفر وتفتحها من أي جهاز.</p>
        <div className="seg">
          <button className={mode === 'login' ? 'on' : ''} type="button" onClick={() => setMode('login')}>دخول</button>
          <button className={mode === 'register' ? 'on' : ''} type="button" onClick={() => setMode('register')}>حساب جديد</button>
        </div>
        <form className="stack" onSubmit={submit}>
          {mode === 'register' && (
            <div>
              <label>الاسم</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="محمود مجدي" />
            </div>
          )}
          <div>
            <label>الإيميل</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </div>
          <div>
            <label>كلمة السر</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 حروف على الأقل" required />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn primary" disabled={busy}>{busy ? 'جاي...' : mode === 'register' ? 'إنشاء الحساب' : 'دخول'}</button>
        </form>
        <div className="auth-or">أو</div>
        {googleId ? (
          <div ref={googleBox} className="google-btn" />
        ) : (
          <button className="btn ghost google-fake" type="button" disabled>
            <GoogleMark />
            تسجيل بجوجل
          </button>
        )}
        {!googleId && <div className="muted" style={{ textAlign: 'center' }}>جوجل هيتفعّل بعد إضافة Client ID</div>}
        <button className="btn ghost" type="button" onClick={onSkip}>استخدم بدون حساب</button>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.7 7.3l6.3 5.2C37.3 38.3 44 33 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  )
}
