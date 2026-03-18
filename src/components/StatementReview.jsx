import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES, formatCurrency } from '../lib/claudeApi.js'

/**
 * StatementReview — shown after AI parses a credit card statement.
 * Renders all line items as an editable checklist.
 * User selects which to import, edits any fields inline, then confirms.
 */
export default function StatementReview({ items: initialItems, imageUrl, onSaved, onClose }) {
  // Each item: { selected, merchant, date, amount, category, is_business, notes }
  const [items, setItems] = useState(
    initialItems.map(item => ({ ...item, selected: item.amount > 0, is_business: false }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const selectedCount = items.filter(i => i.selected).length
  const selectedTotal = items.filter(i => i.selected).reduce((s, i) => s + (Number(i.amount) || 0), 0)

  function toggle(idx) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it))
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function selectAll() { setItems(prev => prev.map(it => ({ ...it, selected: true }))) }
  function selectNone() { setItems(prev => prev.map(it => ({ ...it, selected: false }))) }
  function selectCharges() { setItems(prev => prev.map(it => ({ ...it, selected: it.amount > 0 }))) }

  async function handleImport() {
    const toImport = items.filter(i => i.selected)
    if (toImport.length === 0) { setError('Select at least one item to import'); return }

    for (const it of toImport) {
      if (!it.merchant?.trim()) { setError('All selected items need a merchant name'); return }
      if (isNaN(Number(it.amount))) { setError('All selected items need a valid amount'); return }
    }

    setSaving(true)
    setError(null)

    const rows = toImport.map(it => ({
      date: it.date,
      merchant: it.merchant.trim(),
      amount: parseFloat(it.amount),
      category: it.category,
      is_business: it.is_business || false,
      notes: it.notes?.trim() || null,
      source_type: 'statement',
      image_url: imageUrl || null,
    }))

    const { error: err } = await supabase.from('expenses').insert(rows)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved?.()
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-wide" style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Review Statement</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
              {items.length} transactions detected — select which to import
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>✕</button>
        </div>

        {/* Quick select controls */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '0.3rem 0.75rem' }} onClick={selectAll}>Select All</button>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '0.3rem 0.75rem' }} onClick={selectNone}>Select None</button>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '0.3rem 0.75rem' }} onClick={selectCharges}>Charges Only</button>
          <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center' }}>
            {selectedCount} selected · {formatCurrency(selectedTotal)}
          </div>
        </div>

        <div className="divider" />

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 100px 90px 160px 80px 60px',
          gap: '0.5rem',
          padding: '0 0.25rem',
          marginBottom: '0.25rem',
        }}>
          {['', 'Merchant', 'Date', 'Amount', 'Category', 'Business', 'Notes'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Line items */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              onClick={() => toggle(idx)}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 100px 90px 160px 80px 60px',
                gap: '0.5rem',
                padding: '0.5rem 0.25rem',
                borderRadius: 'var(--radius-md)',
                background: item.selected ? 'var(--bg-elevated)' : 'transparent',
                border: item.selected ? '1px solid var(--border-light)' : '1px solid transparent',
                cursor: 'pointer',
                alignItems: 'center',
                opacity: item.selected ? 1 : 0.45,
              }}
            >
              {/* Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggle(idx)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
              </div>

              {/* Merchant */}
              <input
                className="input"
                value={item.merchant}
                onChange={e => { e.stopPropagation(); updateItem(idx, 'merchant', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ padding: '0.3rem 0.5rem', fontSize: 13 }}
              />

              {/* Date */}
              <input
                className="input"
                type="date"
                value={item.date || ''}
                onChange={e => { e.stopPropagation(); updateItem(idx, 'date', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ padding: '0.3rem 0.5rem', fontSize: 12 }}
              />

              {/* Amount */}
              <input
                className="input"
                type="number"
                step="0.01"
                value={item.amount}
                onChange={e => { e.stopPropagation(); updateItem(idx, 'amount', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{
                  padding: '0.3rem 0.5rem',
                  fontSize: 13,
                  fontWeight: 600,
                  color: Number(item.amount) < 0 ? 'var(--green)' : 'var(--text-primary)',
                  textAlign: 'right',
                }}
              />

              {/* Category */}
              <select
                className="input"
                value={item.category}
                onChange={e => { e.stopPropagation(); updateItem(idx, 'category', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ padding: '0.3rem 0.5rem', fontSize: 12 }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Business flag */}
              <div
                style={{ display: 'flex', justifyContent: 'center' }}
                onClick={e => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={item.is_business || false}
                  onChange={e => updateItem(idx, 'is_business', e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
              </div>

              {/* Notes */}
              <input
                className="input"
                value={item.notes || ''}
                placeholder="Notes"
                onChange={e => { e.stopPropagation(); updateItem(idx, 'notes', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ padding: '0.3rem 0.5rem', fontSize: 12 }}
              />
            </div>
          ))}
        </div>

        <div className="divider" />

        {error && (
          <div style={{ color: 'var(--red)', background: 'var(--red-dim)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', fontSize: 13, marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={saving || selectedCount === 0}>
            {saving ? 'Importing…' : `Import ${selectedCount} Expense${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
