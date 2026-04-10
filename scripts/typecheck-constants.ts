/**
 * Shared constants for typecheck client and daemon.
 * Kept in a separate file so importing these does NOT execute daemon code.
 */
export const DAEMON_SOCKET_PATH = process.env.TYPECHECK_SOCKET ?? '/tmp/typecheck-daemon.sock'
export const DAEMON_LOCK_PATH = `${DAEMON_SOCKET_PATH}.lock`
export const DAEMON_READY_PATH = `${DAEMON_SOCKET_PATH}.ready`
