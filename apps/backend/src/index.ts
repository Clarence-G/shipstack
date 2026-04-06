import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
import { env } from './lib/env'
import { logger } from './lib/logger'
import { generateSpec } from './lib/openapi'
import { router } from './routers'

const app = new Hono()

// CORS — reflect request origin for sandbox compatibility (dynamic port mapping)
app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    credentials: true,
  }),
)

// HTTP request logging
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  const logData = {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms,
  }
  if (c.res.status >= 500) {
    logger.error(logData, 'request error')
  } else if (c.res.status >= 400) {
    logger.warn(logData, 'request client error')
  } else {
    logger.info(logData, 'request')
  }
})

// Better Auth routes — handles login, register, logout, session management
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// oRPC handler — all contract-defined procedures
const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      logger.error({ err: error }, 'rpc error')
    }),
  ],
})

app.use('/rpc/*', async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: '/rpc',
    context: { headers: c.req.raw.headers },
  })

  if (matched) {
    return c.newResponse(response.body, response)
  }

  await next()
})

// OpenAPI spec
app.get('/openapi.json', async (c) => {
  const spec = await generateSpec()
  return c.json(spec)
})

// Scalar API docs UI
app.get('/docs', (c) => {
  const html = `<!doctype html>
<html>
  <head>
    <title>MyApp API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', { url: '/openapi.json' })
    </script>
  </body>
</html>`
  return c.html(html)
})

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

logger.info({ port: env.PORT }, 'server starting')

export default {
  hostname: '0.0.0.0',
  port: env.PORT,
  fetch: app.fetch,
}
