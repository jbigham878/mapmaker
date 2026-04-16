import { BattleData } from './types'

const CACHE_KEY = 'mapmaker-battle-cache'

interface CacheEntry {
  data: BattleData
  ts: number
}

type BattleCache = Record<string, CacheEntry>

function normalizeKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ')
}

function readCache(): BattleCache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

const MAX_CACHE_BYTES = 4_000_000 // 4MB — stay well under 5MB localStorage limit

function evict(cache: BattleCache): BattleCache {
  const entries = Object.entries(cache).sort((a, b) => (b[1].ts ?? 0) - (a[1].ts ?? 0))
  // Keep newest half
  const keep = entries.slice(0, Math.max(1, Math.floor(entries.length / 2)))
  return Object.fromEntries(keep)
}

function writeCache(cache: BattleCache): void {
  try {
    let json = JSON.stringify(cache)
    if (json.length > MAX_CACHE_BYTES) {
      cache = evict(cache)
      json = JSON.stringify(cache)
    }
    localStorage.setItem(CACHE_KEY, json)
  } catch {
    // localStorage quota exceeded — evict and retry once
    try {
      const evicted = evict(cache)
      localStorage.setItem(CACHE_KEY, JSON.stringify(evicted))
    } catch { /* give up silently */ }
  }
}

export function getCached(query: string): BattleData | null {
  const cache = readCache()
  const entry = cache[normalizeKey(query)]
  return entry ? entry.data : null
}

export function setCached(query: string, data: BattleData): void {
  const cache = readCache()
  cache[normalizeKey(query)] = { data, ts: Date.now() }
  writeCache(cache)
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
