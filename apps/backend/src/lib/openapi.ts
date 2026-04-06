import { contract } from '@myapp/contract'
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
})

export async function generateSpec() {
  return generator.generate(contract, {
    info: {
      title: 'MyApp API',
      version: '1.0.0',
      description: 'oRPC contract-first API',
    },
    servers: [{ url: '/rpc' }],
  })
}
