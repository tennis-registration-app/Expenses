import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES } from '../lib/claudeApi.js'

const BLANK = {
  date: new Date().toISOString().slice(0, 10),
  merchant: '',
  amount: '',
  category: CATEGORIES[0],
  is_business: false,
  notes: '',
  source_type: 'manual',
  image_url: '',
}

export default function ExpenseForm({ initial = null, onSaved, onClose }) {
  const [form, setForm] = useState(initial ? {
    date: initial.date || BLANK.date,
    merchant: initial.merchant || '',
    amount: String(initial.amount || ''),
    category: initial.category || CATEGORIES[0],
    is_business: initial.is_business || false,
    notes: initial.notes || '',
    source_type: initial.source_type || 'manual',
    image_url: initial.image_url || '',
  } : BLANK)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.merchant.trim()) { setError('Merchant is required'); return }
    if (!form.amount || isNaN(Number(form.amount))) { setError('Valid amount is required'); return }
    if (!form.date) { setError('Date is required'); return }

    setSaving(true)
    setError(null)

    const payload = {
      date: form.date,
      merchant: form.merchant.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      is_business: form.is_business,
      notes: form.notes.trim() || null,
      source_type: form.source_type,
      image_url: form.image_url || null,
    }

    let err
    if (initial?.id) {
      ;({ error: err } = await supabase.from('expenses').update(payload).eq('id', initial.id))
    } else {
      ;({ error: err } = await supabase.from('expenses').insert(payload))
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved?.()
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
            {initial ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 2 }}>
              <label className="label">Merchant</label>
              <input
                className="input"
                placeholder="e.g. Delta Air Lines"
                value={form.merchant}
                onChange={e => set('merchant', e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Amount ($)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input
              className="input"
              placeholder="Any additional details"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <input
              type="checkbox"
              id="is_business"
              checked={form.is_business}
              onChange={e => set('is_business', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            <label htmlFor="is_business" style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>
              Flag as <strong style={{ color: 'var(--accent)' }}>business expense</strong>
            </label>
          </div>

          {error && (
            <div style={{ color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Add Expense')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
