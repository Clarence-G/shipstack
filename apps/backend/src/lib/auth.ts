import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'
import { db } from '../db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [expo()],
  trustedOrigins: [
    process.env.FRONTEND_URL ?? 'http://localhost:4000',
    // Expo: metro default 8081, --web --port override 8082
    'http://localhost:8081',
    'http://localhost:8082',
    'myapp://',
  ],
})

export type Session = typeof auth.$Infer.Session
