import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase.js'
import { formatCurrency, CATEGORY_COLORS } from '../lib/claudeApi.js'

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: accent || 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  )
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem', fontSize: 13 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill || 'var(--text-primary)', fontWeight: 500 }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ refreshKey }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
      if (!error) setExpenses(data || [])
      setLoading(false)
    }
    load()
  }, [refreshKey])

  // All available months from data
  const availableMonths = [...new Set(expenses.map(e => e.date?.slice(0, 7)).filter(Boolean))].sort().reverse()

  const monthExpenses = expenses.filter(e => e.date?.startsWith(selectedMonth))

  const totalMonth = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const businessTotal = monthExpenses.filter(e => e.is_business).reduce((s, e) => s + e.amount, 0)
  const personalTotal = totalMonth - businessTotal
  const txCount = monthExpenses.length

  // Category breakdown for selected month
  const byCat = {}
  for (const e of monthExpenses) {
    if (!byCat[e.category]) byCat[e.category] = 0
    byCat[e.category] += e.amount
  }
  const categoryData = Object.entries(byCat)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Business vs personal for pie
  const splitData = [
    { name: 'Business', value: businessTotal },
    { name: 'Personal', value: personalTotal },
  ].filter(d => d.value > 0)

  // 6-month trend
  const last6 = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    const total = expenses.filter(e => e.date?.startsWith(ym)).reduce((s, e) => s + e.amount, 0)
    last6.push({ month: `${MONTHS[d.getMonth()]}`, total })
  }

  const recentExpenses = expenses.slice(0, 8)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Month selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <select
          className="input"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{ width: 'auto', marginLeft: 'auto' }}
        >
          {availableMonths.length === 0 && (
            <option value={selectedMonth}>{monthLabel(selectedMonth)}</option>
          )}
          {availableMonths.map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <StatCard label="Total Spend" value={formatCurrency(totalMonth)} sub={`${txCount} transaction${txCount !== 1 ? 's' : ''}`} />
        <StatCard label="Business" value={formatCurrency(businessTotal)} sub={totalMonth ? `${Math.round(businessTotal / totalMonth * 100)}% of total` : '—'} accent="var(--accent)" />
        <StatCard label="Personal" value={formatCurrency(personalTotal)} sub={totalMonth ? `${Math.round(personalTotal / totalMonth * 100)}% of total` : '—'} accent="var(--blue)" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Category bar chart */}
        <div className="card" style={{ flex: 2, minWidth: 280 }}>
          <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            By Category — {monthLabel(selectedMonth)}
          </div>
          {categoryData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No data for this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 12 }}>
                <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map(entry => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#9d9aaa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Business vs Personal pie */}
        {splitData.length > 0 && (
          <div className="card" style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Business vs Personal
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={splitData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  <Cell fill="var(--accent)" />
                  <Cell fill="var(--blue)" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 6-month trend */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          6-Month Trend
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={last6} margin={{ left: 0, right: 0 }}>
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${v}`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Total" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Recent Transactions
        </div>
        {recentExpenses.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0', textAlign: 'center' }}>
            No expenses yet — upload your first receipt!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {recentExpenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.6rem 0', color: 'var(--text-muted)', fontSize: 12, width: 100 }}>
                    {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', fontWeight: 500 }}>{e.merchant}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <span style={{ fontSize: 11, color: CATEGORY_COLORS[e.category] || 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 999, padding: '2px 8px' }}>
                      {e.category}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(e.amount)}
                  </td>
                  <td style={{ padding: '0.6rem 0 0.6rem 0.75rem', textAlign: 'right' }}>
                    <span className={`badge ${e.is_business ? 'badge-business' : 'badge-personal'}`}>
                      {e.is_business ? 'Biz' : 'Personal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
