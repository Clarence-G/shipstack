import { streamToEventIterator } from '@orpc/server'
import { convertToModelMessages, streamText } from 'ai'
import { getModel } from '../lib/ai'
import { authMiddleware, os } from '../orpc'

export const aiRouter = {
  /**
   * Stream a chat conversation via SSE EventIterator.
   * Uses AI SDK streamText + oRPC streamToEventIterator bridge.
   */
  chat: os.ai.chat.use(authMiddleware).handler(async ({ input }) => {
    const result = streamText({
      model: getModel(),
      system: 'You are a helpful assistant.',
      messages: await convertToModelMessages(input.messages),
    })

    return streamToEventIterator(result.toUIMessageStream())
  }),
}
