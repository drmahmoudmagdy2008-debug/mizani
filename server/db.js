import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const root = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')
const usersFile = path.join(root, 'users.json')
const secretFile = path.join(root, 'secret.txt')
const payloadsDir = path.join(root, 'payloads')

function ensure() {
  fs.mkdirSync(payloadsDir, { recursive: true })
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]')
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(48).toString('hex'))
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, data) {
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

ensure()

export function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  return fs.readFileSync(secretFile, 'utf8').trim()
}

export function listUsers() {
  return readJson(usersFile, [])
}

export function saveUsers(users) {
  writeJson(usersFile, users)
}

export function findUser(pred) {
  return listUsers().find(pred) || null
}

export function upsertUser(user) {
  const users = listUsers()
  const i = users.findIndex((u) => u.id === user.id)
  if (i >= 0) users[i] = user
  else users.push(user)
  saveUsers(users)
  return user
}

export function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture || '',
    google: Boolean(user.googleId),
    createdAt: user.createdAt,
  }
}

export function readPayload(userId) {
  return readJson(path.join(payloadsDir, `${userId}.json`), null)
}

export function writePayload(userId, payload) {
  const next = { payload, updatedAt: Date.now() }
  writeJson(path.join(payloadsDir, `${userId}.json`), next)
  return next
}
