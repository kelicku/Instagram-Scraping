import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AppShell } from './layout/AppShell'
import { TipProvider } from './ui/Tooltip'
import { Toaster } from './ui/Toast'
import { LoginPage } from './pages/LoginPage'
import { ClientsPage } from './pages/ClientsPage'
import { KpiPage } from './pages/data/KpiPage'
import { InitiativesPage } from './pages/data/InitiativesPage'
import { MetricsPage } from './pages/data/MetricsPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { ReportDetailPage } from './pages/reports/ReportDetailPage'
import { AuditPage } from './pages/admin/AuditPage'
import { DemoPage } from './pages/admin/DemoPage'

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <TipProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppShell />}>
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/data/kpi" element={<KpiPage />} />
              <Route path="/data/initiatives" element={<InitiativesPage />} />
              <Route path="/data/metrics" element={<MetricsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reports/:id" element={<ReportDetailPage />} />
              <Route path="/admin/audit" element={<AuditPage />} />
              <Route path="/admin/demo" element={<DemoPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/clients" replace />} />
          </Routes>
        </HashRouter>
        <Toaster />
      </TipProvider>
    </MotionConfig>
  )
}
