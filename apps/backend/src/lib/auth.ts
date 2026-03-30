import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'
import { db } from '../db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [expo()],
  trustedOrigins: [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    process.env.MOBILE_URL ?? 'http://localhost:8082',
    'myapp://',
  ],
})

export type Session = typeof auth.$Infer.Session
