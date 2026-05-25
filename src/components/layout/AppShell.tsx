import { Outlet } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import { ReconnectingBanner } from '../ui/ReconnectingBanner'

interface AppShellProps {
  onNewJob?: () => void
}

export default function AppShell({ onNewJob }: AppShellProps) {
  const lowStockCount = useQuery(api.materials.lowStockCount) ?? 0

  // TODO: Uncomment when Convex connection state API is available:
  // import { useConvexConnectionState } from 'convex/react'
  // const { isWebSocketConnected } = useConvexConnectionState()
  const isDisconnected = false

  return (
    <div className="flex h-screen bg-black">
      <ReconnectingBanner isDisconnected={isDisconnected} />
      <Sidebar lowStockCount={lowStockCount} onNewJob={onNewJob} />
      <TopNav lowStockCount={lowStockCount} onNewJob={onNewJob} />
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 h-screen overflow-hidden flex flex-col" aria-label="Main content">
        <Outlet />
      </main>
    </div>
  )
}
