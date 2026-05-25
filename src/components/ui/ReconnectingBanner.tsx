/**
 * ReconnectingBanner — shown when the Convex WebSocket connection is lost.
 *
 * Once convex/_generated/ exists (after `npx convex dev`), replace the
 * `isDisconnected` prop with the real Convex connection state:
 *
 *   import { useConvexConnectionState } from 'convex/react'
 *   const { isWebSocketConnected } = useConvexConnectionState()
 *   <ReconnectingBanner isDisconnected={!isWebSocketConnected} />
 */

interface ReconnectingBannerProps {
  /** Pass true when the Convex WebSocket is disconnected */
  isDisconnected?: boolean
}

export function ReconnectingBanner({ isDisconnected = false }: ReconnectingBannerProps) {
  if (!isDisconnected) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 bg-tertiary-container/90 backdrop-blur-sm text-on-tertiary py-2 px-4 text-label-md"
    >
      <span
        className="material-symbols-outlined text-[16px] animate-spin"
        aria-hidden="true"
      >
        progress_activity
      </span>
      Reconnecting to server…
    </div>
  )
}
