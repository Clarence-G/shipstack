import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { env } from './env'

const openai = createOpenAI({
  apiKey: env.AI_API_KEY,
  baseURL: env.AI_BASE_URL,
})

/**
 * Get the configured AI model.
 * Defaults to gpt-4o-mini. Change via AI_MODEL env var.
 * Compatible with any OpenAI-format provider (OpenAI, DeepSeek, Ollama, etc.)
 */
export function getModel(): LanguageModel {
  return openai(env.AI_MODEL)
}
