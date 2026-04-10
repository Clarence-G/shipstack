import { z } from 'zod'

const envSchema = z
  .object({
    // Environment mode
    ENV: z.enum(['dev', 'prod']).default('prod'),

    // Required in prod, optional in dev (PGlite is used instead)
    DATABASE_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),

    // Optional with defaults
    PORT: z.coerce.number().default(4001),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    FRONTEND_URL: z.string().url().default('http://localhost:4000'),
    MOBILE_URL: z.string().url().default('http://localhost:8082'),

    // AI (optional)
    AI_API_KEY: z.string().optional(),
    AI_BASE_URL: z.string().url().optional(),
    AI_MODEL: z.string().default('gpt-4o-mini'),

    // S3 (optional with dev defaults)
    S3_ENDPOINT: z.string().default('http://localhost:9000'),
    S3_REGION: z.string().default('us-east-1'),
    S3_ACCESS_KEY: z.string().default('minioadmin'),
    S3_SECRET_KEY: z.string().default('minioadmin'),
    S3_BUCKET: z.string().default('uploads'),
  })
  .refine((data) => data.ENV === 'dev' || data.DATABASE_URL !== undefined, {
    message: 'DATABASE_URL is required when ENV=prod',
    path: ['DATABASE_URL'],
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  console.error('\nCheck your .env file against .env.example')
  process.exit(1)
}

export const env = parsed.data
