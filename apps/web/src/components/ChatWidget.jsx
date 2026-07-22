import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import '../App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! Ask me about data engineering salaries/tools by country, or about my projects.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHook, setShowHook] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const openHandler = () => setIsOpen(true)
    window.addEventListener('open-chat-widget', openHandler)
    return () => window.removeEventListener('open-chat-widget', openHandler)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('chat-hook-shown')
    if (!alreadyShown) {
      const timer = setTimeout(() => {
        setShowHook(true)
        sessionStorage.setItem('chat-hook-shown', 'true')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  const examples = [
    'What is the average senior salary in Germany?',
    'What stack did you use for the German Car Market project?',
    'Top tools used in the USA?',
  ]

  const sendMessage = async (text) => {
    const question = (text || input).trim()
    if (!question || loading) return

    setMessages((prev) => [...prev, { sender: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/ask/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      const tag = data.classification === 'analytics' ? '🔍 Queried analytics data' : '📄 Retrieved from case study'
      setMessages((prev) => [...prev, { sender: 'bot', text: data.answer, tag }])
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Sorry, something went wrong reaching the assistant.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showHook && !isOpen && (
        <div className="chat-hook" onClick={() => { setIsOpen(true); setShowHook(false); }}>
          <button className="chat-hook-close" onClick={(e) => { e.stopPropagation(); setShowHook(false); }}>✕</button>
          👋 Curious why I chose Postgres over BigQuery for this? Ask me anything.
        </div>
      )}
      <button className="chat-fab" onClick={() => { setIsOpen(!isOpen); setShowHook(false); }}>💬</button>

      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <div className="chat-title">Ask about my work & data</div>
              <div className="chat-subtitle">Routes to live data or project docs</div>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div className={'msg ' + msg.sender} key={i}>
                {msg.tag && <div className="route-tag">{msg.tag}</div>}
                {msg.sender === 'bot' ? (
                  <div className="msg-markdown"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {loading && <div className="msg bot">Thinking...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-examples">
            {examples.map((ex) => (
              <span className="chat-example" key={ex} onClick={() => sendMessage(ex)}>{ex}</span>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Type a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button className="chat-send" onClick={() => sendMessage()}>Send</button>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatWidget