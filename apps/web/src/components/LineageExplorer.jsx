import { useState, useEffect } from 'react'
import { X, ChevronDown, Database, Layers, Award } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const LAYER_META = {
  bronze: { label: 'Bronze', color: '#A6672E', icon: Database, gloss: 'Raw data as extracted from the source, no transformations applied yet.' },
  silver: { label: 'Silver', color: '#8D97A6', icon: Layers, gloss: 'Cleaned, typed, and structured — this is the real SQL that shaped it.' },
  gold: { label: 'Gold', color: '#B8912B', icon: Award, gloss: 'The final table this number is actually drawn from.' },
  other: { label: 'Other', color: '#64748B', icon: Layers, gloss: '' },
}

function LineageNode({ node, isOpen, onToggle }) {
  const meta = LAYER_META[node.layer] || LAYER_META.other
  const Icon = meta.icon
  return (
    <div className="lineage-node" style={{ '--layer-color': meta.color }}>
      <button className="lineage-node-header" onClick={onToggle}>
        <Icon size={14} className="lineage-node-icon" />
        <span className="lineage-node-name">{node.name}</span>
        {node.sql && <ChevronDown size={14} className={`lineage-node-chevron ${isOpen ? 'open' : ''}`} />}
      </button>
      {isOpen && node.sql && (
        <div className="lineage-node-body">
          <p className="lineage-node-gloss">{meta.gloss}</p>
          <pre className="lineage-node-sql"><code>{node.sql.trim()}</code></pre>
        </div>
      )}
      {isOpen && !node.sql && (
        <div className="lineage-node-body">
          <p className="lineage-node-gloss">{meta.gloss || 'Raw source table — data lands here exactly as extracted, before any transformation.'}</p>
        </div>
      )}
    </div>
  )
}

function LineageColumn({ layer, nodes, openId, setOpenId }) {
  const meta = LAYER_META[layer]
  return (
    <div className="lineage-column">
      <div className="lineage-column-header" style={{ '--layer-color': meta.color }}>
        {meta.label}
        <span className="lineage-column-count">{nodes.length}</span>
      </div>
      <div className="lineage-column-nodes">
        {nodes.map(n => (
          <LineageNode
            key={n.id}
            node={n}
            isOpen={openId === n.id}
            onToggle={() => setOpenId(openId === n.id ? null : n.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default function LineageExplorer({ modelName, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    setData(null)
    setError(null)
    fetch(`${API_BASE}/api/lineage/${modelName}/`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch(() => setError('Could not load lineage data.'))
  }, [modelName])

  const byLayer = { bronze: [], silver: [], gold: [] }
  if (data) {
    for (const n of data.nodes) {
      if (byLayer[n.layer]) byLayer[n.layer].push(n)
    }
  }

  return (
    <div className="lineage-overlay" onClick={onClose}>
      <div className="lineage-panel" onClick={e => e.stopPropagation()}>
        <div className="lineage-panel-header">
          <div>
            <p className="lineage-panel-eyebrow">Tracing</p>
            <h3 className="lineage-panel-title">{modelName}</h3>
          </div>
          <button className="lineage-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="lineage-panel-error">{error}</div>}
        {!error && !data && <div className="lineage-panel-loading">Loading lineage…</div>}

        {data && (
          <div className="lineage-flow">
            <LineageColumn layer="bronze" nodes={byLayer.bronze} openId={openId} setOpenId={setOpenId} />
            <div className="lineage-flow-zone lineage-flow-zone-rough" />
            <LineageColumn layer="silver" nodes={byLayer.silver} openId={openId} setOpenId={setOpenId} />
            <div className="lineage-flow-zone lineage-flow-zone-mid" />
            <LineageColumn layer="gold" nodes={byLayer.gold} openId={openId} setOpenId={setOpenId} />
          </div>
        )}
      </div>
    </div>
  )
}
