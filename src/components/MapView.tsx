import { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import {
  MapContainer, TileLayer, CircleMarker, Polyline, Polygon, Marker, Popup, Tooltip, useMap,
} from 'react-leaflet'
import { Fragment } from 'react'
import { BattleData, Side } from '../types'

const FUN_FACTS = [
  "The muskets used at Bunker Hill were so inaccurate that soldiers were ordered to hold fire until they could 'see the whites of their eyes.'",
  "George Washington crossed the Delaware on Christmas night 1776 in a blizzard — the Hessians at Trenton were caught completely off guard.",
  "The Battle of Saratoga is considered the turning point of the Revolution — it convinced France to openly ally with America.",
  "At Cowpens, Daniel Morgan deliberately placed his least experienced militia in front so they could retreat without breaking the battle line.",
  "The 'shot heard 'round the world' at Lexington and Concord — nobody knows which side fired first.",
  "The Civil War produced more American casualties than all other U.S. wars combined.",
  "Ulysses S. Grant received over 50,000 casualties in just six weeks during the Overland Campaign of 1864.",
  "The Battle of Gettysburg lasted three days and involved around 160,000 soldiers — the largest battle ever fought in North America.",
  "At Antietam, the single bloodiest day in American military history, nearly 23,000 men fell in 12 hours.",
  "The Confederates at Fredericksburg were so well-positioned that Union soldiers called the stone wall they defended 'a slaughter pen.'",
  "Francis Marion, the 'Swamp Fox,' used guerrilla tactics in South Carolina so effectively the British called him 'the devil in the swamp.'",
  "The last major battle of the Revolution at Yorktown was won largely because the French navy blocked British reinforcements.",
  "During the War of 1812, British forces burned the White House. Dolley Madison saved a portrait of Washington before fleeing.",
  "Andrew Jackson's victory at New Orleans was fought two weeks after the war had officially ended — word hadn't arrived yet.",
  "The charge of Pickett's division at Gettysburg covered nearly a mile of open ground under direct artillery and rifle fire.",
  "Black soldiers made up roughly 10% of the Union Army by the war's end — about 180,000 men served in the United States Colored Troops.",
  "The ironclad warships USS Monitor and CSS Virginia (Merrimack) fought the world's first battle between iron-hulled ships in 1862.",
  "William Prescott's militia at Bunker Hill ran so low on gunpowder that soldiers resorted to throwing rocks at the British.",
  "The term 'seeing the elephant' was Civil War slang for experiencing combat for the first time.",
  "At the Battle of Monmouth in 1778, Molly Pitcher (Mary Ludwig Hays) reportedly took over her husband's cannon when he collapsed from heat.",
]

function LoadingOverlay() {
  const [fact, setFact] = useState('')
  const [fade, setFade] = useState(true)
  const idxRef = useRef(Math.floor(Math.random() * FUN_FACTS.length))

  useEffect(() => {
    setFact(FUN_FACTS[idxRef.current])
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        idxRef.current = (idxRef.current + 1) % FUN_FACTS.length
        setFact(FUN_FACTS[idxRef.current])
        setFade(true)
      }, 400)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="map-overlay">
      <div className="map-loading-content">
        <div className="map-loading-cannon">⚔️</div>
        <div className="spinner map-spinner" />
        <p className={`map-loading-fact${fade ? ' fact-visible' : ''}`}>{fact}</p>
      </div>
    </div>
  )
}

const SIDE_COLORS: Record<Side, string> = {
  american: '#3b82f6',
  british:  '#ef4444',
  french:   '#8b5cf6',
  hessian:  '#22c55e',
  neutral:  '#94a3b8',
}

const MARKER_RADIUS: Record<string, number> = {
  fortification: 12, artillery: 11, commander: 10,
  position: 9, landmark: 8, event: 7,
}

const TILE_LAYERS = {
  map:       { label: 'Map',       url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',   attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' },
  terrain:   { label: 'Terrain',   url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                           attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://opentopomap.org">OpenTopoMap</a>' },
  dark:      { label: 'Dark',      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' },
  satellite: { label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; <a href="https://www.esri.com">Esri</a>' },
} as const

type TileKey = keyof typeof TILE_LAYERS
const TILE_KEYS = Object.keys(TILE_LAYERS) as TileKey[]

function calcBearing(from: [number, number], to: [number, number]): number {
  const φ1 = (from[0] * Math.PI) / 180, φ2 = (to[0] * Math.PI) / 180
  const Δλ = ((to[1] - from[1]) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360
}

function getArrows(points: [number, number][]): { pos: [number, number]; bearing: number }[] {
  if (points.length < 2) return []
  const max = 3, step = Math.max(1, Math.ceil((points.length - 1) / max))
  const out: { pos: [number, number]; bearing: number }[] = []
  for (let i = 0; i < points.length - 1; i += step) {
    const [a, b] = [points[i], points[i + 1]]
    out.push({ pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bearing: calcBearing(a, b) })
  }
  return out
}

function makeArrowIcon(color: string, bearing: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${bearing}deg);display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))"><polygon points="7,0 13,14 7,10 1,14" fill="${color}"/></svg>`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  })
}

function FlyToCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.5 }) }, [center, zoom, map])
  return null
}

interface Props {
  battle: BattleData | null
  loading: boolean
  mainBattle: BattleData | null
  compareBattle: BattleData | null
  activeView: 'main' | 'compare'
  onSwitchView: (v: 'main' | 'compare') => void
}

export default function MapView({ battle, loading, mainBattle, compareBattle, activeView, onSwitchView }: Props) {
  const [tile, setTile] = useState<TileKey>('map')
  const compareMode = !!(mainBattle && compareBattle)

  // 'T' key cycles tile styles
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const inInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      if ((e.key === 't' || e.key === 'T') && !inInput && !e.metaKey && !e.ctrlKey) {
        setTile(cur => TILE_KEYS[(TILE_KEYS.indexOf(cur) + 1) % TILE_KEYS.length])
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && <LoadingOverlay />}

      {/* Tile toggle */}
      <div className="tile-controls">
        {TILE_KEYS.map(key => (
          <button key={key} className={`tile-btn${tile === key ? ' active' : ''}`} onClick={() => setTile(key)}>
            {TILE_LAYERS[key].label}
          </button>
        ))}
      </div>

      {/* Compare A/B toggle */}
      {compareMode && (
        <div className="compare-toggle">
          <button
            className={`compare-toggle-btn${activeView === 'main' ? ' active' : ''}`}
            onClick={() => onSwitchView('main')}
          >
            <span className="compare-toggle-label">A</span>
            <span className="compare-toggle-name">{mainBattle!.name}</span>
          </button>
          <div className="compare-toggle-divider">vs</div>
          <button
            className={`compare-toggle-btn${activeView === 'compare' ? ' active' : ''}`}
            onClick={() => onSwitchView('compare')}
          >
            <span className="compare-toggle-label">B</span>
            <span className="compare-toggle-name">{compareBattle!.name}</span>
          </button>
        </div>
      )}

      {/* Export */}
      {battle && (
        <div className="export-controls">
          <button className="export-btn" onClick={() => window.print()} title="Print / Save as PDF">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
          <button className="export-btn" onClick={() => {
            const blob = new Blob([JSON.stringify(battle, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `${battle.name.replace(/\s+/g, '-')}.json`; a.click()
            URL.revokeObjectURL(url)
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            JSON
          </button>
        </div>
      )}

      <MapContainer center={[39.5, -98.35]} zoom={4} style={{ width: '100%', height: '100%' }}>
        <TileLayer key={tile} attribution={TILE_LAYERS[tile].attribution} url={TILE_LAYERS[tile].url} />

        {battle && (
          <>
            <FlyToCenter center={battle.center} zoom={battle.zoom} />

            {battle.zones.map(zone => {
              const color = SIDE_COLORS[zone.side] ?? SIDE_COLORS.neutral
              return (
                <Polygon key={zone.id} positions={zone.points as any}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1.5, opacity: 0.5, dashArray: '5 4' }}>
                  <Tooltip sticky>{zone.label}</Tooltip>
                  <Popup minWidth={200} maxWidth={280}><PopupContent title={zone.label} subtitle={`${zone.type} · ${zone.side}`} body={zone.description} /></Popup>
                </Polygon>
              )
            })}

            {battle.movements.map(movement => {
              const color = SIDE_COLORS[movement.side] ?? SIDE_COLORS.neutral
              return (
                <Fragment key={movement.id}>
                  <Polyline positions={movement.points as any} pathOptions={{
                    color, weight: 3, opacity: 0.85,
                    dashArray: movement.type === 'retreat' ? '10 7' : movement.type === 'encirclement' ? '4 4' : undefined,
                  }}>
                    <Tooltip sticky>{movement.label}</Tooltip>
                    <Popup minWidth={200} maxWidth={280}><PopupContent title={movement.label} subtitle={`${movement.type} · ${movement.side}`} body={movement.description} /></Popup>
                  </Polyline>
                  {getArrows(movement.points).map((a, i) => (
                    <Marker key={`${movement.id}-a${i}`} position={a.pos} icon={makeArrowIcon(color, a.bearing)} interactive={false} />
                  ))}
                </Fragment>
              )
            })}

            {battle.markers.map(marker => {
              const color = SIDE_COLORS[marker.side] ?? SIDE_COLORS.neutral
              const radius = MARKER_RADIUS[marker.type] ?? 9
              return (
                <CircleMarker key={marker.id} center={[marker.lat, marker.lng]} radius={radius}
                  pathOptions={{ color: 'rgba(255,255,255,0.8)', weight: 1.5, fillColor: color, fillOpacity: 0.92 }}>
                  <Tooltip direction="top" offset={[0, -radius]}>{marker.label}</Tooltip>
                  <Popup minWidth={200} maxWidth={280}><PopupContent title={marker.label} subtitle={`${marker.type} · ${marker.side}`} body={marker.description} /></Popup>
                </CircleMarker>
              )
            })}
          </>
        )}
      </MapContainer>
    </div>
  )
}

function PopupContent({ title, subtitle, body }: { title: string; subtitle: string; body: string }) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2px 0' }}>
      <strong style={{ fontSize: '14px', display: 'block', marginBottom: '3px' }}>{title}</strong>
      <em style={{ fontSize: '11px', color: '#888', textTransform: 'capitalize', display: 'block', marginBottom: '6px' }}>{subtitle}</em>
      <p style={{ fontSize: '13px', lineHeight: '1.5', margin: 0, color: '#333' }}>{body}</p>
    </div>
  )
}
