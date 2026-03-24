import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

const openai = createOpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
})

/**
 * Get the configured AI model.
 * Defaults to gpt-4o-mini. Change via AI_MODEL env var.
 * Compatible with any OpenAI-format provider (OpenAI, DeepSeek, Ollama, etc.)
 */
export function getModel(): LanguageModel {
  return openai(process.env.AI_MODEL ?? 'gpt-4o-mini')
}
