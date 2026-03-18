import { useState } from 'react'
import Dashboard from './components/Dashboard.jsx'
import Upload from './components/Upload.jsx'
import ExpenseList from './components/ExpenseList.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'upload',    label: 'Upload',    icon: '⊕' },
  { id: 'expenses',  label: 'Expenses',  icon: '≡' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  function onExpenseSaved() {
    setRefreshKey(k => k + 1)
    setTab('expenses')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            color: 'var(--accent)',
            letterSpacing: '-0.01em',
          }}>
            Ledger
          </span>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            paddingLeft: '0.75rem',
            borderLeft: '1px solid var(--border)',
          }}>
            Expense Tracker
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '0.25rem' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
                border: tab === t.id ? '1px solid var(--border-light)' : '1px solid transparent',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 1rem',
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                fontWeight: tab === t.id ? 500 : 400,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span style={{ fontSize: '12px' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        {tab === 'dashboard' && <Dashboard refreshKey={refreshKey} />}
        {tab === 'upload'    && <Upload onSaved={onExpenseSaved} />}
        {tab === 'expenses'  && <ExpenseList refreshKey={refreshKey} />}
      </main>
    </div>
  )
}
