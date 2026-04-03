import pino from 'pino'

export const logger = pino({
  level: import.meta.env.DEV ? 'debug' : 'warn',
  browser: {
    asObject: true,
  },
})
