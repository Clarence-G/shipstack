import { streamText, convertToModelMessages } from 'ai'
import { streamToEventIterator } from '@orpc/server'
import { os, authMiddleware } from '../orpc'
import { getModel } from '../lib/ai'

export const aiRouter = {
  /**
   * Stream a chat conversation via SSE EventIterator.
   * Uses AI SDK streamText + oRPC streamToEventIterator bridge.
   */
  chat: os.ai.chat
    .use(authMiddleware)
    .handler(async ({ input }) => {
      const result = streamText({
        model: getModel(),
        system: 'You are a helpful assistant.',
        messages: await convertToModelMessages(input.messages),
      })

      return streamToEventIterator(result.toUIMessageStream())
    }),
}
