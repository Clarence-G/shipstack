import { useChat } from '@ai-sdk/react'
import { eventIteratorToUnproxiedDataStream } from '@orpc/client'
import { useState } from 'react'
import { client } from '@/lib/orpc'

/**
 * AI Chat component — optional, uses oRPC streaming via AI SDK's useChat hook.
 *
 * Requires:
 * - Authenticated user session
 * - Valid AI_API_KEY on the backend
 */
export function Chat() {
  const [chatId] = useState(() => crypto.randomUUID())
  const [inputValue, setInputValue] = useState('')

  const { messages, sendMessage, status } = useChat({
    transport: {
      async sendMessages(options) {
        const iter = await client.ai.chat(
          { chatId, messages: options.messages },
          { signal: options.abortSignal },
        )
        return eventIteratorToUnproxiedDataStream(iter as any)
      },
      reconnectToStream() {
        throw new Error('Unsupported')
      },
    },
  })

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground">Start a conversation...</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {message.parts.map((part, index) =>
                part.type === 'text' ? <span key={index}>{part.text}</span> : null,
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (inputValue.trim()) {
            sendMessage({ text: inputValue })
            setInputValue('')
          }
        }}
        className="border-t p-4 flex gap-2"
      >
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={status !== 'ready'}
          placeholder="Say something..."
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={status !== 'ready'}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
