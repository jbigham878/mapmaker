import { BattleData } from './types'

const CACHE_KEY = 'mapmaker-battle-cache'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours — battles don't change

interface CacheEntry {
  data: BattleData
  cachedAt: number
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
  const key = normalizeKey(query)
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.cachedAt > TTL_MS) {
    delete cache[key]
    writeCache(cache)
    return null
  }
  return entry.data
}

export function setCached(query: string, data: BattleData): void {
  const cache = readCache()
  cache[normalizeKey(query)] = { data, cachedAt: Date.now() }
  writeCache(cache)
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
