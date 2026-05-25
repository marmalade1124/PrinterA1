import { NavLink, useNavigate } from 'react-router-dom'
import { clearToken } from '../../lib/auth'
import { Badge } from '../ui/Badge'

interface SidebarProps {
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
]

const footerLinks: { to: string; label: string; icon: string }[] = []

export default function Sidebar({ lowStockCount = 0, onNewJob }: SidebarProps) {
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 glass-panel z-50">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-primary text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              precision_manufacturing
            </span>
          </div>
          <div>
            <h1 className="text-headline-md font-bold text-on-surface tracking-tight leading-tight">
              PrintOS
            </h1>
            <p className="text-label-sm text-on-surface-variant">Precision Control</p>
          </div>
        </div>
        <button
          onClick={onNewJob}
          className="mt-4 w-full bg-primary text-on-primary py-2 px-4 rounded-lg text-label-md font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-h-[44px]"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
          New Print Job
        </button>
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
        {navLinks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
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
              <Badge variant="count" className="ml-auto">
                {lowStockCount}
              </Badge>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 flex flex-col gap-1">
        {footerLinks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-label-md ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`
            }
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              {icon}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}

        {/* User profile + logout */}
        <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-white/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">
              person
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-sm text-on-surface truncate">Admin</p>
            <p className="text-[10px] text-on-surface-variant truncate">Business Owner</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="text-on-surface-variant hover:text-error transition-colors p-1 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
