/**
 * TypeCheck Client
 *
 * Usage: bun run typecheck <file>
 *
 * Startup flow:
 *   1. Check if daemon socket already exists → connect directly
 *   2. If not: try to create a "spawning" sentinel file atomically
 *      a. Created (won the race) → spawn daemon, wait for daemon's ready-file
 *      b. Already exists (lost race) → poll for socket file to appear
 *   3. Send { file } request over Unix socket, print diagnostics
 *
 * The "spawning" sentinel (.spawning) is separate from daemon's lockfile
 * (.lock) — daemon writes its own lock at startup. This avoids a race where
 * the client holding the lock prevents the daemon from starting.
 */

import * as net from 'net'
import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { DAEMON_SOCKET_PATH, DAEMON_READY_PATH } from './typecheck-constants'

// ── CLI arg ──────────────────────────────────────────────────────────────────

const targetArg = process.argv[2]
if (!targetArg) {
  process.stderr.write('Usage: bun run typecheck <file>\n')
  process.exit(1)
}
const targetFile = path.resolve(targetArg)

if (!fs.existsSync(targetFile)) {
  process.stderr.write(`File not found: ${targetFile}\n`)
  process.exit(1)
}

// ── Daemon management ────────────────────────────────────────────────────────

const DAEMON_SCRIPT = path.resolve(import.meta.dirname, 'typecheck-daemon.ts')
// Sentinel file: signals that some client is currently spawning the daemon
// Separate from daemon's .lock file (which daemon owns)
const SPAWNING_SENTINEL = `${DAEMON_SOCKET_PATH}.spawning`

const POLL_INTERVAL_MS = 50
const WAIT_TIMEOUT_MS = 15_000

function fileExists(p: string): boolean {
  try { fs.accessSync(p); return true } catch { return false }
}

/** Atomically claim the right to spawn the daemon. Returns true if won. */
function tryClaimSpawn(): boolean {
  try {
    const fd = fs.openSync(SPAWNING_SENTINEL, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL)
    fs.writeSync(fd, String(process.pid))
    fs.closeSync(fd)
    return true
  } catch {
    return false
  }
}

async function pollFor(predicate: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`)
    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
}

async function spawnDaemon(): Promise<void> {
  try {
    // Spawn fully detached — daemon outlives client
    const daemon = spawn(process.execPath, [DAEMON_SCRIPT], {
      detached: true,
      stdio: 'ignore',
    })
    daemon.unref()

    // Wait for daemon to write its ready-file (socket is listening)
    await pollFor(() => fileExists(DAEMON_READY_PATH), WAIT_TIMEOUT_MS, 'daemon ready-file')
  } finally {
    // Always release spawning sentinel so future clients don't block
    try { fs.unlinkSync(SPAWNING_SENTINEL) } catch { /* fine */ }
  }
}

async function ensureDaemon(): Promise<void> {
  // Fast path: socket file exists → daemon running
  if (fileExists(DAEMON_SOCKET_PATH)) return

  if (tryClaimSpawn()) {
    // We won — spawn daemon and wait
    await spawnDaemon()
  } else {
    // Another client is spawning — wait for socket
    await pollFor(() => fileExists(DAEMON_SOCKET_PATH), WAIT_TIMEOUT_MS, 'daemon socket')
  }
}

// ── Send request to daemon ────────────────────────────────────────────────────

interface DiagnosticRecord {
  text: string
  file: string
  line: number
  col: number
  code: number
}

interface CheckResponse {
  ok: boolean
  errors?: DiagnosticRecord[]
  fatal?: string
}

function sendRequest(file: string): Promise<CheckResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(DAEMON_SOCKET_PATH)
    let buf = ''

    socket.on('connect', () => {
      socket.write(JSON.stringify({ file }) + '\n')
    })

    socket.on('data', (chunk) => {
      buf += chunk.toString()
      const nl = buf.indexOf('\n')
      if (nl === -1) return
      try {
        resolve(JSON.parse(buf.slice(0, nl)) as CheckResponse)
      } catch {
        reject(new Error(`Invalid daemon response: ${buf}`))
      }
      socket.destroy()
    })

    socket.on('error', reject)
  })
}

// ── Format and print diagnostics ─────────────────────────────────────────────

const RESET  = '\x1b[0m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const DIM    = '\x1b[2m'

function formatDiagnostics(errors: DiagnosticRecord[], targetFile: string): void {
  const cwd = process.cwd()
  for (const d of errors) {
    const rel = path.relative(cwd, d.file)
    const loc = `${CYAN}${rel}${RESET}${DIM}:${d.line}:${d.col}${RESET}`
    const code = `${YELLOW}TS${d.code}${RESET}`
    const msg = `${RED}${d.text}${RESET}`
    process.stdout.write(`${loc} — ${code}: ${msg}\n`)
  }
  const rel = path.relative(cwd, targetFile)
  process.stdout.write(`\nFound ${RED}${errors.length} error(s)${RESET} in ${CYAN}${rel}${RESET}\n`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Try once — if socket is stale, recover and retry once
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await ensureDaemon()
    } catch (err) {
      process.stderr.write(`Failed to start typecheck daemon: ${err instanceof Error ? err.message : err}\n`)
      process.exit(1)
    }

    let response: CheckResponse
    try {
      response = await sendRequest(targetFile)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (attempt === 0 && (code === 'ENOENT' || code === 'ECONNREFUSED')) {
        // Stale socket — clean up and let the loop retry
        try { fs.unlinkSync(DAEMON_SOCKET_PATH) } catch { /* fine */ }
        try { fs.unlinkSync(DAEMON_READY_PATH) } catch { /* fine */ }
        continue
      }
      process.stderr.write(`Daemon request failed: ${err instanceof Error ? err.message : err}\n`)
      process.exit(1)
    }

    if (response.fatal) {
      process.stderr.write(`${RED}Error:${RESET} ${response.fatal}\n`)
      process.exit(1)
    }

    if (response.ok) {
      const rel = path.relative(process.cwd(), targetFile)
      process.stdout.write(`✓ No type errors in ${CYAN}${rel}${RESET}\n`)
      process.exit(0)
    }

    formatDiagnostics(response.errors ?? [], targetFile)
    process.exit(1)
  }

  process.stderr.write('Failed to connect to daemon after retry\n')
  process.exit(1)
}

main()
