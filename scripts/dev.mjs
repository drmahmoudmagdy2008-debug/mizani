import { spawn } from 'child_process'

const procs = [
  spawn('node', ['server/index.js'], { stdio: 'inherit', env: process.env }),
  spawn('npx', ['vite', '--host'], { stdio: 'inherit', env: process.env }),
]

function stop() {
  procs.forEach((p) => p.kill())
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
