import { useState, useEffect } from 'react'
import MapView from './components/MapView'
import BattlePanel from './components/BattlePanel'
import { BattleData } from './types'
import { Campaign } from './data/battles'
import { getCached, setCached } from './cache'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

const HISTORY_KEY = 'mapmaker-history'

function loadHistory(): BattleData[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') }
  catch { return [] }
}
function saveHistory(h: BattleData[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

interface ActiveCampaign { campaign: Campaign; index: number }

function getInitialBattle(): string | null {
  try { return new URLSearchParams(window.location.search).get('battle') }
  catch { return null }
}

export default function App() {
  const [battle, setBattle]               = useState<BattleData | null>(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [history, setHistory]             = useState<BattleData[]>(loadHistory)
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Compare mode
  const [compareBattle, setCompareBattle] = useState<BattleData | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [activeView, setActiveView]       = useState<'main' | 'compare'>('main')

  const displayBattle = activeView === 'compare' && compareBattle ? compareBattle : battle

  // ── Keyboard shortcuts
  useKeyboardShortcuts({
    campaignActive: !!activeCampaign,
    loading,
    onCampaignPrev: () => activeCampaign && handleCampaignNav('prev'),
    onCampaignNext: () => activeCampaign && handleCampaignNav('next'),
  })

  // ── Preload bundled battles into cache on first mount
  useEffect(() => {
    fetch('/preloaded-battles.json')
      .then(r => r.ok ? r.json() : {})
      .then((map: Record<string, BattleData>) => {
        for (const [key, data] of Object.entries(map)) {
          if (!getCached(key)) setCached(key, data)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL sync
  useEffect(() => {
    if (!battle) return
    const p = new URLSearchParams()
    p.set('battle', battle.name)
    window.history.replaceState({}, '', `?${p}`)
  }, [battle?.name])

  useEffect(() => {
    const name = getInitialBattle()
    if (name) handleSubmit(name)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Campaign preloading
  useEffect(() => {
    if (!activeCampaign) return
    const nextIndex = activeCampaign.index + 1
    if (nextIndex >= activeCampaign.campaign.battles.length) return
    const nextName = activeCampaign.campaign.battles[nextIndex]
    if (getCached(nextName)) return
    fetch('/api/generate-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: nextName }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setCached(nextName, d) })
      .catch(() => {})
  }, [activeCampaign?.index, activeCampaign?.campaign.label]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyBattle(b: BattleData) {
    setBattle(b)
    setActiveView('main')
    const next = [b, ...history.filter(h => h.name !== b.name)].slice(0, 15)
    setHistory(next)
    saveHistory(next)
  }

  async function handleSubmit(query: string) {
    if (!query.trim() || loading) return
    const cached = getCached(query)
    if (cached) { applyBattle(cached); setError(null); return }
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/generate-map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate map')
      setCached(query, data as BattleData)
      applyBattle(data as BattleData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred')
    } finally { setLoading(false) }
  }

  async function handleCompareSubmit(query: string) {
    if (!query.trim() || compareLoading) return
    const cached = getCached(query)
    if (cached) { setCompareBattle(cached); setActiveView('compare'); return }
    setCompareLoading(true)
    try {
      const res  = await fetch('/api/generate-map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate map')
      setCached(query, data as BattleData)
      setCompareBattle(data as BattleData)
      setActiveView('compare')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compare failed')
    } finally { setCompareLoading(false) }
  }

  function handleExitCompare() { setCompareBattle(null); setActiveView('main') }

  function handleSelectHistory(b: BattleData) { setBattle(b); setError(null); setActiveCampaign(null); setActiveView('main') }
  function handleRemoveHistory(name: string) {
    const next = history.filter(b => b.name !== name); setHistory(next); saveHistory(next)
  }

  function handleStartCampaign(campaign: Campaign) {
    setActiveCampaign({ campaign, index: 0 }); handleSubmit(campaign.battles[0])
  }
  function handleCampaignNav(direction: 'prev' | 'next') {
    if (!activeCampaign) return
    const idx = direction === 'next' ? activeCampaign.index + 1 : activeCampaign.index - 1
    setActiveCampaign({ ...activeCampaign, index: idx })
    handleSubmit(activeCampaign.campaign.battles[idx])
  }
  function handleExitCampaign() { setActiveCampaign(null) }

  return (
    <div className={`app${sidebarOpen ? ' sidebar-open' : ''}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="app-title-row">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            <h1 className="app-title">MapMaker</h1>
          </div>
          <p className="app-subtitle">Historical Battle Maps</p>
          <button className="mobile-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close">✕</button>
        </div>
        <BattlePanel
          battle={displayBattle}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          onSelectHistory={handleSelectHistory}
          onRemoveHistory={handleRemoveHistory}
          onStartCampaign={handleStartCampaign}
          onCampaignNav={handleCampaignNav}
          onExitCampaign={handleExitCampaign}
          history={history}
          activeCampaign={activeCampaign}
          compareBattle={compareBattle}
          compareLoading={compareLoading}
          activeView={activeView}
          onCompareSubmit={handleCompareSubmit}
          onExitCompare={handleExitCompare}
          onSwitchView={setActiveView}
        />
      </aside>
      <main className="map-area">
        <button className="mobile-sidebar-toggle" onClick={() => setSidebarOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Battles
        </button>
        <MapView
          battle={displayBattle}
          loading={loading || compareLoading}
          mainBattle={battle}
          compareBattle={compareBattle}
          activeView={activeView}
          onSwitchView={setActiveView}
        />
      </main>
    </div>
  )
}
