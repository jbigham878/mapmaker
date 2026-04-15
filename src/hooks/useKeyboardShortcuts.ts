import { useEffect } from 'react'

interface Options {
  campaignActive: boolean
  loading: boolean
  onCampaignPrev: () => void
  onCampaignNext: () => void
}

export function useKeyboardShortcuts({ campaignActive, loading, onCampaignPrev, onCampaignNext }: Options) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      // '/' → focus search bar
      if (e.key === '/' && !inInput) {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('.search-input')
        input?.focus()
        input?.select()
      }

      // Arrow keys → campaign navigation (not when typing)
      if (!inInput && !loading && campaignActive) {
        if (e.key === 'ArrowLeft')  onCampaignPrev()
        if (e.key === 'ArrowRight') onCampaignNext()
      }
    }

    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [campaignActive, loading, onCampaignPrev, onCampaignNext])
}
