import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AuthGuard from './components/AuthGuard'
import AppShell from './components/layout/AppShell'
import DashboardPage from './pages/DashboardPage'
import JobQueuePage from './pages/JobQueuePage'
import PricingEnginePage from './pages/PricingEnginePage'
import InventoryPage from './pages/InventoryPage'
import PrintersPage from './pages/PrintersPage'
import UsageHistoryPage from './pages/UsageHistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import SupportPage from './pages/SupportPage'

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Authenticated routes */}
      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobQueuePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/printers" element={<PrintersPage />} />
          <Route path="/pricing" element={<PricingEnginePage />} />
          <Route path="/usage" element={<UsageHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Route>
      </Route>

      {/* Catch-all: redirect unknown paths to /dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
