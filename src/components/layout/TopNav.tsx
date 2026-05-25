import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clearToken } from '../../lib/auth'
import { Badge } from '../ui/Badge'

interface TopNavProps {
  lowStockCount?: number
  onNewJob?: () => void
}

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/jobs', label: 'Job Queue', icon: 'pending_actions' },
  { to: '/inventory', label: 'Inventory', icon: 'inventory_2' },
  { to: '/printers', label: 'Printers', icon: 'precision_manufacturing' },
  { to: '/pricing', label: 'Pricing Engine', icon: 'payments' },
  { to: '/usage', label: 'Usage History', icon: 'history' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/support', label: 'Support', icon: 'help' },
]

export default function TopNav({ lowStockCount = 0, onNewJob }: TopNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Top bar — mobile only */}
      <nav className="md:hidden fixed top-0 left-0 w-full glass-panel h-16 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-[24px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            precision_manufacturing
          </span>
          <span className="text-headline-md font-bold text-on-surface">PrintOS</span>
        </div>
        <div className="flex items-center gap-2">
          {onNewJob && (
            <button
              onClick={onNewJob}
              aria-label="New print job"
              className="text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-full p-2 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">add</span>
            </button>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            className="text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-full p-2 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 glass-panel z-50 flex flex-col transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Navigation menu"
        aria-hidden={!drawerOpen}
      >
        {/* Drawer header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              precision_manufacturing
            </span>
            <span className="text-headline-md font-bold text-on-surface">PrintOS</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="text-on-surface-variant hover:text-on-surface p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-label-md ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
              <span>{label}</span>
              {to === '/inventory' && lowStockCount > 0 && (
                <Badge variant="count" className="ml-auto">{lowStockCount}</Badge>
              )}
            </NavLink>
          ))}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-on-surface-variant hover:text-error hover:bg-white/5 transition-colors text-label-md min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  )
}
