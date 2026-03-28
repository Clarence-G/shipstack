import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { RPCHandler } from '@orpc/server/fetch'
import { onError } from '@orpc/server'
import { auth } from './lib/auth'
import { router } from './routers'

const app = new Hono()

// CORS — must be registered before routes
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4000',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    credentials: true,
  }),
)

// Better Auth routes — handles login, register, logout, session management
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// oRPC handler — all contract-defined procedures
const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
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

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export default {
  hostname: '0.0.0.0',
  port: Number(process.env.PORT ?? 4001),
  fetch: app.fetch,
}
