import React, { useState, useRef, useEffect } from 'react'

const SUGGESTION_PROMPTS = [
  'Explain this concept in simple words',
  'Give me a real-world example',
  'What are the 3 most important exam takeaways?',
  'Ask me a challenging question to test my understanding',
  'Summarize the key definitions',
]

export default function AITutorChat({ apiBase, sourceContext, sourceTitle }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your FlashAI Tutor. I'm ready to help you master **"${sourceTitle || 'your selected material'}"**. Ask me anything, or pick a prompt below!`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const sendMessage = async (textToSend) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    const newMsgs = [...messages, { role: 'user', content: text }]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${apiBase}/ai-tutor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          source_context: sourceContext || 'No additional source material provided.',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'AI Tutor failed to respond.')

      setMessages([...newMsgs, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message || 'Could not connect to AI Tutor.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  return (
    <div className="ai-tutor-container">
      <div className="tutor-header">
        <div className="tutor-badge">
          <span className="tutor-avatar-icon">🎓</span>
          <div>
            <h4>FlashAI Personalized Tutor</h4>
            <span className="grounded-tag">
              Grounded in: <strong>{sourceTitle || 'Selected Document'}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="tutor-messages-box">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="chat-bubble">
              <span className="message-author">{msg.role === 'user' ? 'You' : '✦ FlashAI Tutor'}</span>
              <div className="message-body" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="chat-bubble loading-bubble">
              <span className="message-author">✦ FlashAI Tutor</span>
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="tutor-error-banner">{error}</div>}

      <div className="tutor-quick-prompts">
        {SUGGESTION_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            className="prompt-chip"
            onClick={() => sendMessage(prompt)}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="tutor-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="tutor-text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your tutor any question about this material..."
          disabled={loading}
        />
        <button type="submit" className="tutor-send-btn" disabled={loading || !input.trim()}>
          Send →
        </button>
      </form>
    </div>
  )
}
