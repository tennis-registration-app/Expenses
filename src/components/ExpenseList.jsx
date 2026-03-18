import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES, CATEGORY_COLORS, formatCurrency, formatDate } from '../lib/claudeApi.js'
import ExpenseForm from './ExpenseForm.jsx'

const MONTHS_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthOptions(expenses) {
  const months = [...new Set(expenses.map(e => e.date?.slice(0, 7)).filter(Boolean))].sort().reverse()
  return months
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_LABELS[m - 1]} ${y}`
}

function exportToCsv(expenses) {
  const headers = ['Date', 'Merchant', 'Amount', 'Category', 'Business', 'Source', 'Notes']
  const rows = expenses.map(e => [
    e.date || '',
    `"${(e.merchant || '').replace(/"/g, '""')}"`,
    e.amount?.toFixed(2) || '',
    `"${e.category || ''}"`,
    e.is_business ? 'Yes' : 'No',
    e.source_type || '',
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExpenseList({ refreshKey }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterBiz, setFilterBiz] = useState('all') // 'all' | 'business' | 'personal'
  const [search, setSearch] = useState('')

  // Sort
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    load()
  }, [refreshKey])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
    if (!error) setExpenses(data || [])
    setLoading(false)
  }

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const months = useMemo(() => monthOptions(expenses), [expenses])

  const filtered = useMemo(() => {
    let list = expenses

    if (filterMonth !== 'all') list = list.filter(e => e.date?.startsWith(filterMonth))
    if (filterCategory !== 'all') list = list.filter(e => e.category === filterCategory)
    if (filterBiz === 'business') list = list.filter(e => e.is_business)
    if (filterBiz === 'personal') list = list.filter(e => !e.is_business)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.merchant?.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q))
    }

    // Sort
    list = [...list].sort((a, b) => {
      let av, bv
      if (sortField === 'date') { av = a.date || ''; bv = b.date || '' }
      else if (sortField === 'merchant') { av = (a.merchant || '').toLowerCase(); bv = (b.merchant || '').toLowerCase() }
      else if (sortField === 'amount') { av = a.amount || 0; bv = b.amount || 0 }
      else if (sortField === 'category') { av = (a.category || '').toLowerCase(); bv = (b.category || '').toLowerCase() }
      else { av = a[sortField]; bv = b[sortField] }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [expenses, filterMonth, filterCategory, filterBiz, search, sortField, sortDir])

  const filteredTotal = filtered.reduce((s, e) => s + (e.amount || 0), 0)

  async function handleDelete(id) {
    setDeleting(true)
    await supabase.from('expenses').delete().eq('id', id)
    setDeleting(false)
    setConfirmDelete(null)
    load()
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <span style={{ opacity: 0.2 }}>↕</span>
    return <span style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginRight: 'auto' }}>Expenses</h1>

        <button
          className="btn btn-ghost"
          onClick={() => setEditing({})}
          style={{ fontSize: 13 }}
        >
          + Add Manually
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => exportToCsv(filtered)}
          disabled={filtered.length === 0}
          style={{ fontSize: 13 }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '0.875rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Search merchant or notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />

        <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 140 }}>
          <option value="all">All months</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        <select className="input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: 180 }}>
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="input" value={filterBiz} onChange={e => setFilterBiz(e.target.value)} style={{ width: 140 }}>
          <option value="all">All types</option>
          <option value="business">Business only</option>
          <option value="personal">Personal only</option>
        </select>

        <div style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>
          {filtered.length} transactions · {formatCurrency(filteredTotal)}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {expenses.length === 0 ? 'No expenses yet — upload your first receipt!' : 'No expenses match the current filters'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: 'Date', field: 'date', w: 110 },
                  { label: 'Merchant', field: 'merchant', w: null },
                  { label: 'Category', field: 'category', w: 180 },
                  { label: 'Amount', field: 'amount', w: 110, align: 'right' },
                  { label: 'Type', field: null, w: 90, align: 'center' },
                  { label: '', field: null, w: 72 },
                ].map(col => (
                  <th
                    key={col.label}
                    onClick={col.field ? () => toggleSort(col.field) : undefined}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: col.align || 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: col.field ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                      width: col.w || undefined,
                      userSelect: 'none',
                    }}
                  >
                    {col.label} {col.field && <SortIcon field={col.field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, idx) => (
                <tr
                  key={e.id}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'transparent',
                  }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ fontWeight: 500 }}>{e.merchant || '—'}</div>
                    {e.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{e.notes}</div>}
                    {e.image_url && (
                      <a href={e.image_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', opacity: 0.7 }}>
                        📎 receipt
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <span style={{
                      fontSize: 11, borderRadius: 999, padding: '2px 8px',
                      background: 'var(--bg-elevated)',
                      color: CATEGORY_COLORS[e.category] || 'var(--text-muted)',
                      border: `1px solid ${CATEGORY_COLORS[e.category] ? CATEGORY_COLORS[e.category] + '33' : 'var(--border)'}`,
                    }}>
                      {e.category || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: e.amount < 0 ? 'var(--green)' : 'var(--text-primary)' }}>
                    {formatCurrency(e.amount)}
                  </td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                    <span className={`badge ${e.is_business ? 'badge-business' : 'badge-personal'}`}>
                      {e.is_business ? 'Business' : 'Personal'}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => setEditing(e)}
                        className="btn btn-ghost"
                        style={{ padding: '0.2rem 0.5rem', fontSize: 12 }}
                        title="Edit"
                      >✎</button>
                      <button
                        onClick={() => setConfirmDelete(e)}
                        className="btn btn-danger"
                        style={{ padding: '0.2rem 0.5rem', fontSize: 12 }}
                        title="Delete"
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <ExpenseForm
          initial={editing?.id ? editing : null}
          onSaved={() => { setEditing(null); load() }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="modal" style={{ padding: '1.5rem', maxWidth: 400 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>Delete expense?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: '1.25rem' }}>
              <strong>{confirmDelete.merchant}</strong> — {formatCurrency(confirmDelete.amount)} on {formatDate(confirmDelete.date)}<br />
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
