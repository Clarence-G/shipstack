/**
 * TypeCheck Daemon — ts.createProgram server over Unix socket
 *
 * Both single-file and project checks use ts.createProgram (identical to
 * tsc --noEmit), guaranteeing correctness for complex generics like oRPC's
 * Implementer<T>. Single-file requests run a full project check and filter
 * results to the target file.
 *
 * Startup flow (concurrent-safe):
 *   1. Try to create lockfile atomically via O_EXCL (only one process wins)
 *   2. If lock exists but owner PID is dead → clean up stale files, retry
 *   3. Winner starts the server, writes ready-file once socket is listening
 *   4. Losers poll for socket file to appear (client handles this)
 *
 * Protocol (newline-delimited JSON over Unix socket):
 *   Request:  { "file": "/abs/path/to/foo.ts" }
 *           | { "project": "/abs/path/to/workspace" }
 *   Response: { "ok": true }
 *           | { "ok": false, "errors": [{ text, file, line, col, code }] }
 *           | { "ok": false, "fatal": "error message" }
 *
 * The daemon exits automatically after IDLE_TIMEOUT_MS of no requests.
 */

import * as ts from 'typescript'
import * as net from 'net'
import * as path from 'path'
import * as fs from 'fs'
import { DAEMON_SOCKET_PATH, DAEMON_LOCK_PATH, DAEMON_READY_PATH } from './typecheck-constants'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

// ── Per-project state (host + builder cache) ──────────────────────────────────

interface ProjectState {
  host: ts.CompilerHost
  sfCache: Map<string, { mtime: number; sf: ts.SourceFile }>
  builder: ts.SemanticDiagnosticsBuilderProgram | undefined
}

const projectStates = new Map<string, ProjectState>()

function getOrCreateState(configPath: string): ProjectState {
  const existing = projectStates.get(configPath)
  if (existing) return existing

  const host = ts.createCompilerHost({})
  const projectRoot = path.dirname(configPath)
  host.getCurrentDirectory = () => projectRoot

  // mtime-based SourceFile cache: avoid re-parsing unchanged files on each check
  const sfCache = new Map<string, { mtime: number; sf: ts.SourceFile }>()
  const _getSF = host.getSourceFile.bind(host)
  host.getSourceFile = (fileName, langVersion, onError, shouldCreateNew) => {
    try {
      const mtime = fs.statSync(fileName).mtimeMs
      const cached = sfCache.get(fileName)
      if (cached && cached.mtime === mtime && !shouldCreateNew) return cached.sf
      // Re-read from disk (file changed or first access)
      const content = fs.readFileSync(fileName, 'utf-8')
      const sf = ts.createSourceFile(fileName, content, langVersion, true)
      sf.version = String(mtime) // required by SemanticDiagnosticsBuilderProgram
      sfCache.set(fileName, { mtime, sf })
      return sf
    } catch {
      return _getSF(fileName, langVersion, onError, shouldCreateNew)
    }
  }

  const state: ProjectState = { host, sfCache, builder: undefined }
  projectStates.set(configPath, state)
  return state
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

// ── Request handlers ──────────────────────────────────────────────────────────

// file: single-file check  |  project: full-workspace check
type DaemonRequest = { file: string } | { project: string }
interface CheckResponse { ok: boolean; errors?: DiagnosticRecord[]; fatal?: string }

function runProjectCheck(configPath: string): CheckResponse {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    return { ok: false, fatal: ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n') }
  }

  const projectRoot = path.dirname(configPath)
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectRoot)

  // Reuse or create per-project state (host + builder + sfCache)
  const state = getOrCreateState(configPath)
  // Refresh compiler options from tsconfig (handles tsconfig changes)
  state.host.getCompilationSettings = () => parsed.options

  // SemanticDiagnosticsBuilderProgram:
  //   cold: checks all files, caches per-file diagnostics
  //   warm (no changes): getSemanticDiagnosticsOfNextAffectedFile returns immediately
  //   warm (file changed): only affected files re-checked
  const builder = ts.createSemanticDiagnosticsBuilderProgram(
    parsed.fileNames, parsed.options, state.host, state.builder,
  )
  state.builder = builder

  const diagnostics: ts.Diagnostic[] = []
  let affected = builder.getSemanticDiagnosticsOfNextAffectedFile()
  while (affected !== undefined) {
    for (const d of affected.result) {
      if (!d.file?.fileName.includes('/node_modules/')) diagnostics.push(d)
    }
    affected = builder.getSemanticDiagnosticsOfNextAffectedFile()
  }

  // Syntactic diagnostics (separate pass, always fast)
  for (const sf of builder.getProgram().getSourceFiles()) {
    if (sf.fileName.includes('/node_modules/')) continue
    for (const d of builder.getProgram().getSyntacticDiagnostics(sf)) {
      diagnostics.push(d)
    }
  }

  if (diagnostics.length === 0) return { ok: true }
  return { ok: false, errors: diagnostics.map(toDiagnosticRecord) }
}

function handleFileCheck(filePath: string): CheckResponse {
  // Run full project check (ts.createProgram) then filter to target file.
  // This guarantees accuracy for complex mapped types (e.g. oRPC Implementer<T>).
  const configPath = ts.findConfigFile(path.dirname(filePath), ts.sys.fileExists, 'tsconfig.json')
  if (!configPath) return { ok: false, fatal: `No tsconfig.json found for ${filePath}` }

  const result = runProjectCheck(configPath)
  if (result.ok || result.fatal) return result

  const fileErrors = (result.errors ?? []).filter(e => e.file === filePath)
  return fileErrors.length === 0 ? { ok: true } : { ok: false, errors: fileErrors }
}

function handleProjectCheck(projectDir: string): CheckResponse {
  const configPath = ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json')
  if (!configPath) return { ok: false, fatal: `No tsconfig.json found in ${projectDir}` }
  return runProjectCheck(configPath)
}

function handleRequest(req: DaemonRequest): CheckResponse {
  if ('file' in req) return handleFileCheck(req.file)
  return handleProjectCheck(req.project)
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

      let req: DaemonRequest
      try {
        req = JSON.parse(line)
      } catch {
        socket.write(JSON.stringify({ ok: false, fatal: 'Invalid JSON request' }) + '\n')
        socket.end()
        return
      }

      socket.write(JSON.stringify(handleRequest(req)) + '\n')
      socket.end()
      resetIdleTimer(server)
    })

    socket.on('error', () => { /* client disconnected early */ })
  })

  try { fs.unlinkSync(DAEMON_SOCKET_PATH) } catch { /* fine */ }
  try { fs.unlinkSync(DAEMON_READY_PATH) } catch { /* fine */ }

  server.listen(DAEMON_SOCKET_PATH, () => {
    resetIdleTimer(server)
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
  try { process.kill(pid, 0); return true } catch { return false }
}

function readLockPid(): number | null {
  try {
    const pid = parseInt(fs.readFileSync(DAEMON_LOCK_PATH, 'utf-8').trim(), 10)
    return isNaN(pid) ? null : pid
  } catch { return null }
}

function cleanStaleLockIfDead(): boolean {
  const pid = readLockPid()
  if (pid === null || !isPidAlive(pid)) {
    try { fs.unlinkSync(DAEMON_LOCK_PATH) } catch { /* race */ }
    try { fs.unlinkSync(DAEMON_SOCKET_PATH) } catch { /* fine */ }
    try { fs.unlinkSync(DAEMON_READY_PATH) } catch { /* fine */ }
    return true
  }
  return false
}

function tryAcquireLock(): boolean {
  try {
    const fd = fs.openSync(DAEMON_LOCK_PATH, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL)
    fs.writeSync(fd, String(process.pid))
    fs.closeSync(fd)
    return true
  } catch { return false }
}

function acquireLockWithStalenessCheck(): boolean {
  if (tryAcquireLock()) return true
  if (cleanStaleLockIfDead()) return tryAcquireLock()
  return false
}

if (acquireLockWithStalenessCheck()) {
  startServer()
} else {
  process.exit(0)
}
