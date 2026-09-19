import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import {
  findUser,
  jwtSecret,
  publicUser,
  readPayload,
  upsertUser,
  writePayload,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')

const app = express()
const PORT = Number(process.env.PORT || 3001)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

app.use(express.json({ limit: '4mb' }))

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function tokenFor(user) {
  return jwt.sign({ uid: user.id }, jwtSecret(), { expiresIn: '30d' })
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const raw = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!raw) return res.status(401).json({ error: 'سجل دخولك الأول' })
  try {
    const data = jwt.verify(raw, jwtSecret())
    const user = findUser((u) => u.id === data.uid)
    if (!user) return res.status(401).json({ error: 'الحساب مش موجود' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'الجلسة انتهت، سجل دخول تاني' })
  }
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function safeName(name) {
  return String(name || '').trim().slice(0, 40) || 'مستخدم ميزاني'
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'mizani-api' })
})

app.get('/api/auth/config', (_req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID || null })
})

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const name = safeName(req.body?.name)
  if (!validEmail(email)) return res.status(400).json({ error: 'الإيميل مش صحيح' })
  if (password.length < 6) return res.status(400).json({ error: 'الباسورد 6 حروف على الأقل' })
  if (findUser((u) => u.email === email)) return res.status(409).json({ error: 'الإيميل مستخدم قبل كده' })
  const user = upsertUser({
    id: uid(),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    googleId: '',
    picture: '',
    createdAt: Date.now(),
  })
  res.json({ token: tokenFor(user), user: publicUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const user = findUser((u) => u.email === email)
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'الإيميل أو الباسورد غلط' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'الإيميل أو الباسورد غلط' })
  res.json({ token: tokenFor(user), user: publicUser(user) })
})

app.post('/api/auth/google', async (req, res) => {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'تسجيل جوجل مش مفعّل. حط GOOGLE_CLIENT_ID في السيرفر' })
  }
  const credential = String(req.body?.credential || '')
  if (!credential) return res.status(400).json({ error: 'مفيش توكن من جوجل' })
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload?.email) return res.status(401).json({ error: 'حساب جوجل من غير إيميل' })
    const email = payload.email.toLowerCase()
    let user = findUser((u) => u.googleId === payload.sub || u.email === email)
    if (!user) {
      user = upsertUser({
        id: uid(),
        name: safeName(payload.name),
        email,
        passwordHash: '',
        googleId: payload.sub,
        picture: payload.picture || '',
        createdAt: Date.now(),
      })
    } else {
      user = upsertUser({
        ...user,
        googleId: user.googleId || payload.sub,
        picture: user.picture || payload.picture || '',
        name: user.name || safeName(payload.name),
      })
    }
    res.json({ token: tokenFor(user), user: publicUser(user) })
  } catch {
    res.status(401).json({ error: 'تحقق جوجل فشل. راجع Client ID' })
  }
})

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

app.get('/api/data', auth, (req, res) => {
  res.json(readPayload(req.user.id) || { payload: null, updatedAt: 0 })
})

app.put('/api/data', auth, (req, res) => {
  const payload = req.body?.payload
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'بيانات ناقصة' })
  const saved = writePayload(req.user.id, payload)
  res.json(saved)
})

if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`mizani api on http://localhost:${PORT}`)
})
