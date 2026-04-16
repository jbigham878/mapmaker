import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { BattleData, Side } from '../types'
import { BATTLE_CATEGORIES, CAMPAIGNS, Campaign } from '../data/battles'

const ALL_BATTLES = BATTLE_CATEGORIES.flatMap(cat =>
  cat.battles.map(name => ({ name, era: cat.label }))
)

const SIDE_LABELS: Record<string, string> = {
  american:    'American',
  british:     'British',
  french:      'French',
  hessian:     'Hessian',
  confederate: 'Confederate',
  german:      'German',
  russian:     'Russian',
  japanese:    'Japanese',
  ottoman:     'Ottoman',
  other:       'Other',
}

interface ActiveCampaign {
  campaign: Campaign
  index: number
}

interface Props {
  battle: BattleData | null
  loading: boolean
  error: string | null
  onSubmit: (query: string) => void
  onSelectHistory: (battle: BattleData) => void
  onRemoveHistory: (name: string) => void
  onStartCampaign: (campaign: Campaign) => void
  onCampaignNav: (direction: 'prev' | 'next') => void
  onExitCampaign: () => void
  history: BattleData[]
  activeCampaign: ActiveCampaign | null
  compareBattle: BattleData | null
  compareLoading: boolean
  activeView: 'main' | 'compare'
  onCompareSubmit: (query: string) => void
  onExitCompare: () => void
  onSwitchView: (v: 'main' | 'compare') => void
}

type Tab = 'battles' | 'campaigns'

export default function BattlePanel({
  battle, loading, error, onSubmit, onSelectHistory, onRemoveHistory,
  onStartCampaign, onCampaignNav, onExitCampaign, history, activeCampaign,
  compareBattle, compareLoading, activeView, onCompareSubmit, onExitCompare, onSwitchView,
}: Props) {
  const [compareQuery, setCompareQuery] = useState('')
  const [showCompareInput, setShowCompareInput] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])
  const compareMode = !!compareBattle
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('battles')
  const [openEras, setOpenEras] = useState<string[]>(['Revolutionary War'])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    return ALL_BATTLES.filter(b => b.name.toLowerCase().includes(q)).slice(0, 8)
  }, [query])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (focusedIdx >= 0 && suggestions[focusedIdx]) {
      selectSuggestion(suggestions[focusedIdx].name)
    } else {
      onSubmit(query)
      setShowSuggestions(false)
    }
  }

  function selectSuggestion(name: string) {
    setQuery(name)
    setShowSuggestions(false)
    setFocusedIdx(-1)
    onSubmit(name)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setFocusedIdx(-1)
    }
  }

  function handleBattle(name: string) {
    setQuery(name)
    onSubmit(name)
  }

  function toggleEra(label: string) {
    setOpenEras(prev =>
      prev.includes(label) ? prev.filter(e => e !== label) : [...prev, label]
    )
  }

  const camp = activeCampaign?.campaign
  const campIndex = activeCampaign?.index ?? 0

  return (
    <>
      {/* Campaign navigation banner */}
      {activeCampaign && camp && (
        <div className="campaign-banner">
          <div className="campaign-banner-top">
            <div className="campaign-banner-name">{camp.label}</div>
            <button className="campaign-exit" onClick={onExitCampaign} title="Exit campaign">✕</button>
          </div>
          <div className="campaign-banner-era">{camp.era}</div>
          <div className="campaign-nav">
            <button
              className="campaign-nav-btn"
              onClick={() => onCampaignNav('prev')}
              disabled={loading || campIndex === 0}
            >
              ← Prev
            </button>
            <span className="campaign-nav-count">
              {campIndex + 1} / {camp.battles.length}
            </span>
            <button
              className="campaign-nav-btn"
              onClick={() => onCampaignNav('next')}
              disabled={loading || campIndex === camp.battles.length - 1}
            >
              Next →
            </button>
          </div>
          <div className="campaign-battle-name">{camp.battles[campIndex]}</div>
        </div>
      )}

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-group" ref={searchRef}>
          <div className="autocomplete-wrap">
            <input
              className="search-input"
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setShowSuggestions(true)
                setFocusedIdx(-1)
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Battle of Bunker Hill"
              disabled={loading}
              autoFocus
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    className={`suggestion-item${i === focusedIdx ? ' focused' : ''}`}
                    onMouseDown={() => selectSuggestion(s.name)}
                    onMouseEnter={() => setFocusedIdx(i)}
                  >
                    <span className="suggestion-name">{s.name}</span>
                    <span className="suggestion-era">{s.era}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="search-btn" type="submit" disabled={loading || !query.trim()}>
            {loading ? '…' : 'Map it'}
          </button>
        </div>
      </form>

      <div className="sidebar-content">
        {error && (
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p className="loading-label">Generating battle map…</p>
            <p className="loading-sub">Researching troop positions,<br />commanders, and movements</p>
          </div>
        )}

        {!loading && battle && (
          <div className="battle-info">
            <h2 className="battle-name">{battle.name}</h2>
            <p className="battle-meta">{battle.date} · {battle.location}</p>
            <div className="battle-meta-row">
              <span className={`outcome-badge outcome-${battle.outcome}`}>
                {battle.outcomeLabel}
              </span>
              <button className="share-btn" onClick={handleShare} title="Copy link">
                {copied ? (
                  <span className="share-copied">Copied!</span>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                )}
                {!copied && 'Share'}
              </button>
            </div>

            {/* Compare UI */}
            {!compareMode && !showCompareInput && (
              <button className="compare-open-btn" onClick={() => setShowCompareInput(true)}>
                ⚖ Compare with another battle
              </button>
            )}
            {!compareMode && showCompareInput && (
              <div className="compare-search-wrap">
                <div className="compare-search-label">Compare with:</div>
                <div className="compare-search-row">
                  <input
                    className="search-input compare-input"
                    placeholder="e.g. Battle of Trenton"
                    value={compareQuery}
                    onChange={e => setCompareQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && compareQuery.trim()) { onCompareSubmit(compareQuery); setShowCompareInput(false) } if (e.key === 'Escape') { setShowCompareInput(false) } }}
                    autoFocus
                  />
                  <button className="search-btn" disabled={compareLoading || !compareQuery.trim()}
                    onClick={() => { onCompareSubmit(compareQuery); setShowCompareInput(false) }}>
                    {compareLoading ? '…' : 'Go'}
                  </button>
                  <button className="compare-cancel-btn" onClick={() => setShowCompareInput(false)}>✕</button>
                </div>
              </div>
            )}
            {compareMode && (
              <div className="compare-active-bar">
                <button className={`compare-slot-btn${activeView === 'main' ? ' active' : ''}`} onClick={() => onSwitchView('main')}>
                  <span className="compare-slot-label">A</span> {battle.name}
                </button>
                <span className="compare-vs">vs</span>
                <button className={`compare-slot-btn${activeView === 'compare' ? ' active' : ''}`} onClick={() => onSwitchView('compare')}>
                  <span className="compare-slot-label">B</span> {compareBattle!.name}
                </button>
                <button className="compare-exit-btn" onClick={() => { onExitCompare(); setShowCompareInput(false) }} title="Exit compare">✕</button>
              </div>
            )}

            <div className="section">
              <div className="section-title">Overview</div>
              <p className="description">{battle.description}</p>
            </div>

            {Object.keys(battle.commanders).length > 0 && (
              <div className="section">
                <div className="section-title">Commanders</div>
                <div className="commanders-list">
                  {(Object.entries(battle.commanders) as [string, string[]][]).map(([side, names]) => (
                    <div key={side} className="commander-row">
                      <div className={`side-dot ${side}`} />
                      <div>
                        <span className="commander-side">{SIDE_LABELS[side] ?? side}: </span>
                        <span className="commander-names">{names.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(battle.casualties).length > 0 && (
              <div className="section">
                <div className="section-title">Casualties</div>
                <div className="casualties-grid">
                  {(Object.entries(battle.casualties) as [string, string][]).map(([side, value]) => (
                    <div key={side} className="casualty-item">
                      <div className={`casualty-side ${side}`}>{SIDE_LABELS[side] ?? side}</div>
                      <div className="casualty-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section">
              <div className="section-title">Historical Significance</div>
              <p className="description">{battle.significance}</p>
            </div>

            <div className="section">
              <div className="section-title">Map Legend</div>
              <div className="legend-items">
                {Array.from(new Set([
                  ...battle.markers.map(m => m.side),
                  ...battle.movements.map(m => m.side),
                ])).filter(s => s !== 'neutral').map(side => (
                  <div key={side} className="legend-item">
                    <div className={`legend-dot side-dot ${side}`} />
                    <span>{SIDE_LABELS[side] ?? side} Forces</span>
                  </div>
                ))}
                <div className="legend-divider" />
                <div className="legend-item">
                  <div className="legend-line-solid" />
                  <span>Advance / Flanking</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line-dashed" />
                  <span>Retreat</span>
                </div>
                <div className="legend-item">
                  <div className="legend-zone-box" />
                  <span>Fortification / Zone</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History — shown first when non-empty */}
        {history.length > 0 && !loading && (
          <div className="history-section">
            <div className="section-title">Recent Battles</div>
            <div className="history-list">
              {history.map(b => (
                <div
                  key={b.name}
                  className={`history-item${battle?.name === b.name ? ' active' : ''}`}
                >
                  <button className="history-name" onClick={() => onSelectHistory(b)}>
                    <span className="history-battle-name">{b.name}</span>
                    <span className="history-battle-date">{b.date}</span>
                  </button>
                  <button
                    className="history-remove"
                    onClick={() => onRemoveHistory(b.name)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browse section — shown when not loading */}
        {!loading && (
          <div className={`browse-section${battle ? ' browse-section--compact' : ''}`}>
            {!battle && (
              <p className="kb-hint" style={{ marginBottom: 12 }}>
                <kbd>/</kbd> search &nbsp;·&nbsp; <kbd>T</kbd> tile style &nbsp;·&nbsp; <kbd>←</kbd><kbd>→</kbd> campaign
              </p>
            )}
            <div className="browse-tabs">
              <button
                className={`browse-tab${tab === 'battles' ? ' active' : ''}`}
                onClick={() => setTab('battles')}
              >
                Battles
              </button>
              <button
                className={`browse-tab${tab === 'campaigns' ? ' active' : ''}`}
                onClick={() => setTab('campaigns')}
              >
                Campaigns
              </button>
            </div>

            {tab === 'battles' && (
              <div className="era-list">
                {BATTLE_CATEGORIES.map(cat => (
                  <div key={cat.label} className="era-folder">
                    <button
                      className={`era-header${openEras.includes(cat.label) ? ' open' : ''}`}
                      onClick={() => toggleEra(cat.label)}
                    >
                      <span>{cat.label}</span>
                      <span className="era-count">{cat.battles.length}</span>
                      <svg
                        className={`era-chevron${openEras.includes(cat.label) ? ' open' : ''}`}
                        width="12" height="12" viewBox="0 0 12 12" fill="none"
                      >
                        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {openEras.includes(cat.label) && (
                      <div className="era-battles">
                        {cat.battles.map(name => (
                          <button
                            key={name}
                            className={`era-battle-btn${battle?.name === name ? ' active' : ''}`}
                            onClick={() => handleBattle(name)}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'campaigns' && (
              <div className="campaign-list">
                {CAMPAIGNS.map(c => (
                  <div key={c.label} className={`campaign-card${activeCampaign?.campaign.label === c.label ? ' active' : ''}`}>
                    <div className="campaign-card-header">
                      <div>
                        <div className="campaign-card-name">{c.label}</div>
                        <div className="campaign-card-era">{c.era}</div>
                      </div>
                      <button
                        className="campaign-start-btn"
                        onClick={() => onStartCampaign(c)}
                        disabled={loading}
                      >
                        {activeCampaign?.campaign.label === c.label ? 'Active' : 'Start'}
                      </button>
                    </div>
                    <div className="campaign-battles-preview">
                      {c.battles.map((b, i) => (
                        <span key={b} className={`campaign-battle-dot${activeCampaign?.campaign.label === c.label && activeCampaign.index === i ? ' current' : ''}`} title={b} />
                      ))}
                      <span className="campaign-battles-count">{c.battles.length} battles</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}
