import { BattleData } from './types'

const CACHE_KEY = 'mapmaker-battle-cache'

interface CacheEntry {
  data: BattleData
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

function writeCache(cache: BattleCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full — clear old entries and try once more
    try {
      localStorage.removeItem(CACHE_KEY)
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
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
  cache[normalizeKey(query)] = { data }
  writeCache(cache)
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
