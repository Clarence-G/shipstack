import { oc } from '@orpc/contract'
import type { UIMessage } from 'ai'
import { z } from 'zod'

/**
 * AI contract.
 *
 * Provides streaming chat via oRPC EventIterator.
 * Backend uses AI SDK with configurable OpenAI-compatible provider.
 * Frontend uses @ai-sdk/react's useChat with custom oRPC transport.
 */
export const aiContract = {
  /**
   * Stream a chat conversation.
   * Input: chatId to identify the conversation, messages array (AI SDK UIMessage format).
   * Output: SSE EventIterator stream (UIMessageStreamPart).
   * Requires authentication (authMiddleware).
   *
   * Frontend usage:
   *   useChat({ transport: { sendMessages: (opts) =>
   *     eventIteratorToUnproxiedDataStream(await client.ai.chat({...}))
   *   }})
   */
  chat: oc.input(
    z.object({
      chatId: z.string().describe('Unique conversation identifier'),
      messages: z.custom<UIMessage[]>().describe('Chat messages in AI SDK UIMessage format'),
    }),
  ),
}
