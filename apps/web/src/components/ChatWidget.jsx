import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import '../App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hi! Ask me about my career, credentials and expertise, or how this site's live data pipeline works." }
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
    "What is Aakash's work experience?",
    "What tools/technologies is he an expert in?",
    'What data pipelines power this site?',
    'Which skill\'s salary is growing the fastest?',
    'Is AI tooling on GitHub growing faster than traditional tools?',
    'Which country is predicted to become more AI-leaning soon?',
    'How has Python\'s adoption changed over the last decade?',
    'What are the most common organizational archetypes for data teams?',
    'Which open-source tool has the strongest momentum right now?',
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
          👋 Ask me about my career, tools I work with, or how this site's live data pipeline works.
        </div>
      )}
      <button className="chat-fab" onClick={() => { setIsOpen(!isOpen); setShowHook(false); }}>💬</button>

      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <div className="chat-title">Ask about my career & work</div>
              <div className="chat-subtitle">My background, credentials, tools, or live pipeline data</div>
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

          {messages.length === 1 && (
          <div className="chat-examples">
            {examples.map((ex) => (
              <span className="chat-example" key={ex} onClick={() => sendMessage(ex)}>{ex}</span>
            ))}
          </div>

          )}
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