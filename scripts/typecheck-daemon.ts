/**
 * TypeCheck Daemon — Language Service server over Unix socket
 *
 * Startup flow (concurrent-safe):
 *   1. Try to create lockfile atomically via O_EXCL (only one process wins)
 *   2. If lock exists but owner PID is dead → clean up stale files, retry
 *   3. Winner starts the server, writes ready-file once socket is listening
 *   4. Losers poll for socket file to appear (client handles this)
 *
 * Protocol (newline-delimited JSON over Unix socket):
 *   Request:  { "file": "/abs/path/to/foo.ts" }
 *   Response: { "ok": true }
 *              | { "ok": false, "errors": [...] }
 *              | { "ok": false, "fatal": "error message" }
 *
 * The daemon exits automatically after IDLE_TIMEOUT_MS of no requests.
 */

import * as ts from 'typescript'
import * as net from 'net'
import * as path from 'path'
import * as fs from 'fs'
import { DAEMON_SOCKET_PATH, DAEMON_LOCK_PATH, DAEMON_READY_PATH } from './typecheck-constants'

// ── Constants ──────────────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

// ── Language Service cache (one per tsconfig.json) ──────────────────────────

interface ServiceEntry {
  service: ts.LanguageService
  host: MutableLanguageServiceHost
  configPath: string
}

const serviceCache = new Map<string, ServiceEntry>()

class MutableLanguageServiceHost implements ts.LanguageServiceHost {
  private fileVersions = new Map<string, number>()
  private fileContents = new Map<string, string>()

  constructor(
    private compilerOptions: ts.CompilerOptions,
    private rootFileNames: string[],
  ) {
    for (const f of rootFileNames) {
      this.fileVersions.set(f, 0)
    }
  }

  // Bump version so Language Service re-checks this file on next call
  updateFile(filePath: string): void {
    const current = this.fileVersions.get(filePath) ?? 0
    this.fileVersions.set(filePath, current + 1)
    this.fileContents.delete(filePath) // force re-read from disk
  }

  ensureFile(filePath: string): void {
    if (!this.fileVersions.has(filePath)) {
      this.fileVersions.set(filePath, 0)
      this.rootFileNames.push(filePath)
    }
  }

  getCompilationSettings() { return this.compilerOptions }
  getScriptFileNames() { return this.rootFileNames }
  getScriptVersion(fileName: string) { return String(this.fileVersions.get(fileName) ?? 0) }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    let content = this.fileContents.get(fileName)
    if (content === undefined) {
      try {
        content = fs.readFileSync(fileName, 'utf-8')
        this.fileContents.set(fileName, content)
      } catch {
        return undefined
      }
    }
    return ts.ScriptSnapshot.fromString(content)
  }

  getCurrentDirectory() { return process.cwd() }
  getDefaultLibFileName(options: ts.CompilerOptions) { return ts.getDefaultLibFilePath(options) }
  fileExists(fileName: string) { return ts.sys.fileExists(fileName) }
  readFile(fileName: string) { return ts.sys.readFile(fileName) }
  readDirectory(p: string, ext?: readonly string[], excl?: readonly string[], incl?: readonly string[], depth?: number) {
    return ts.sys.readDirectory(p, ext, excl, incl, depth)
  }
  directoryExists(dirName: string) { return ts.sys.directoryExists(dirName) }
  getDirectories(dirPath: string) { return ts.sys.getDirectories(dirPath) }
}

function getOrCreateService(filePath: string): ServiceEntry | { fatal: string } {
  const configPath = ts.findConfigFile(path.dirname(filePath), ts.sys.fileExists, 'tsconfig.json')
  if (!configPath) return { fatal: `No tsconfig.json found for ${filePath}` }

  const cached = serviceCache.get(configPath)
  if (cached) {
    cached.host.ensureFile(filePath)
    cached.host.updateFile(filePath)
    return cached
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    return { fatal: ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n') }
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath))
  const host = new MutableLanguageServiceHost(parsed.options, [filePath])
  const service = ts.createLanguageService(host, ts.createDocumentRegistry())
  const entry: ServiceEntry = { service, host, configPath }
  serviceCache.set(configPath, entry)
  return entry
}

// ── Diagnostic serialization ──────────────────────────────────────────────────

interface DiagnosticRecord {
  text: string
  file: string
  line: number
  col: number
  code: number
}

function toDiagnosticRecord(d: ts.Diagnostic): DiagnosticRecord {
  let line = 0, col = 0
  if (d.file && d.start !== undefined) {
    const pos = d.file.getLineAndCharacterOfPosition(d.start)
    line = pos.line + 1
    col = pos.character + 1
  }
  return {
    text: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    file: d.file?.fileName ?? '',
    line,
    col,
    code: d.code,
  }
}

// ── Request handler ───────────────────────────────────────────────────────────

interface CheckRequest { file: string }
interface CheckResponse { ok: boolean; errors?: DiagnosticRecord[]; fatal?: string }

function handleCheck(req: CheckRequest): CheckResponse {
  const entry = getOrCreateService(req.file)
  if ('fatal' in entry) return { ok: false, fatal: entry.fatal }

  const { service } = entry
  const diagnostics = [
    ...service.getSyntacticDiagnostics(req.file),
    ...service.getSemanticDiagnostics(req.file),
  ]

  if (diagnostics.length === 0) return { ok: true }
  return { ok: false, errors: diagnostics.map(toDiagnosticRecord) }
}

// ── Unix socket server ────────────────────────────────────────────────────────

let idleTimer: ReturnType<typeof setTimeout> | null = null

function resetIdleTimer(server: net.Server) {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    server.close()
    cleanup()
    process.exit(0)
  }, IDLE_TIMEOUT_MS)
}

function cleanup() {
  for (const p of [DAEMON_SOCKET_PATH, DAEMON_LOCK_PATH, DAEMON_READY_PATH]) {
    try { fs.unlinkSync(p) } catch { /* already gone */ }
  }
}

function startServer() {
  const server = net.createServer((socket) => {
    resetIdleTimer(server)
    let buf = ''

    socket.on('data', (chunk) => {
      buf += chunk.toString()
      const nl = buf.indexOf('\n')
      if (nl === -1) return

      const line = buf.slice(0, nl)
      buf = buf.slice(nl + 1)

      let req: CheckRequest
      try {
        req = JSON.parse(line)
      } catch {
        socket.write(JSON.stringify({ ok: false, fatal: 'Invalid JSON request' }) + '\n')
        socket.end()
        return
      }

      socket.write(JSON.stringify(handleCheck(req)) + '\n')
      socket.end()
      resetIdleTimer(server)
    })

    socket.on('error', () => { /* client disconnected early */ })
  })

  // Remove stale socket file from previous crash
  try { fs.unlinkSync(DAEMON_SOCKET_PATH) } catch { /* fine */ }
  try { fs.unlinkSync(DAEMON_READY_PATH) } catch { /* fine */ }

  server.listen(DAEMON_SOCKET_PATH, () => {
    resetIdleTimer(server)
    // Write ready-file last — client only proceeds once this exists
    fs.writeFileSync(DAEMON_READY_PATH, String(process.pid))
  })

  server.on('error', (err) => {
    process.stderr.write(`Daemon server error: ${err.message}\n`)
    cleanup()
    process.exit(1)
  })

  process.on('exit', cleanup)
  process.on('SIGINT', () => { cleanup(); process.exit(0) })
  process.on('SIGTERM', () => { cleanup(); process.exit(0) })
}

// ── Concurrent-safe startup ───────────────────────────────────────────────────

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0) // signal 0 = existence check, no actual signal
    return true
  } catch {
    return false
  }
}

function readLockPid(): number | null {
  try {
    const content = fs.readFileSync(DAEMON_LOCK_PATH, 'utf-8').trim()
    const pid = parseInt(content, 10)
    return isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

function cleanStaleLockIfDead(): boolean {
  const pid = readLockPid()
  if (pid === null || !isPidAlive(pid)) {
    // Stale lock — clean up so we can retry
    try { fs.unlinkSync(DAEMON_LOCK_PATH) } catch { /* race: someone else cleaned it */ }
    try { fs.unlinkSync(DAEMON_SOCKET_PATH) } catch { /* fine */ }
    try { fs.unlinkSync(DAEMON_READY_PATH) } catch { /* fine */ }
    return true // cleaned
  }
  return false // owner still alive
}

function tryAcquireLock(): boolean {
  try {
    // O_EXCL = atomic create-or-fail — only one process wins the race
    const fd = fs.openSync(DAEMON_LOCK_PATH, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL)
    fs.writeSync(fd, String(process.pid))
    fs.closeSync(fd)
    return true
  } catch {
    return false
  }
}

function acquireLockWithStalenessCheck(): boolean {
  if (tryAcquireLock()) return true

  // Lock exists — check if owner is still alive
  if (cleanStaleLockIfDead()) {
    // Stale lock cleaned — try once more
    return tryAcquireLock()
  }

  // Owner alive — another daemon is starting or running
  return false
}

if (acquireLockWithStalenessCheck()) {
  startServer()
} else {
  // Another live process holds the lock — daemon already starting/running
  // Client will poll for socket file and connect
  process.exit(0)
}
