import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { parseReceiptImage, fileToBase64, CATEGORIES, formatCurrency } from '../lib/claudeApi.js'
import StatementReview from './StatementReview.jsx'
import ExpenseForm from './ExpenseForm.jsx'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']

const STEPS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',     // Uploading to Supabase Storage
  PARSING: 'parsing',         // Sending to Claude
  REVIEW_RECEIPT: 'review_receipt',
  REVIEW_STATEMENT: 'review_statement',
  DONE: 'done',
  ERROR: 'error',
}

export default function Upload({ onSaved }) {
  const [step, setStep] = useState(STEPS.IDLE)
  const [dragOver, setDragOver] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  const reset = useCallback(() => {
    setStep(STEPS.IDLE)
    setStatusMsg('')
    setErrorMsg('')
    setParsedData(null)
    setImageUrl(null)
    setPreviewUrl(null)
  }, [])

  async function processFile(file) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setStep(STEPS.ERROR)
      setErrorMsg(`Unsupported file type: ${file.type}. Please use JPEG, PNG, WebP, or HEIC.`)
      return
    }

    // Local preview
    setPreviewUrl(URL.createObjectURL(file))

    try {
      // 1. Upload to Supabase Storage
      setStep(STEPS.UPLOADING)
      setStatusMsg('Uploading image…')
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('expense-receipts').upload(path, file)
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
      const { data: { publicUrl } } = supabase.storage.from('expense-receipts').getPublicUrl(path)
      setImageUrl(publicUrl)

      // 2. Parse with Claude
      setStep(STEPS.PARSING)
      setStatusMsg('Analyzing with AI…')
      const base64 = await fileToBase64(file)
      const result = await parseReceiptImage(base64, file.type)

      if (result.source_type === 'error') {
        throw new Error(result.message || 'AI could not parse this image')
      }

      setParsedData({ ...result, imageUrl: publicUrl })

      if (result.source_type === 'statement') {
        setStep(STEPS.REVIEW_STATEMENT)
      } else {
        setStep(STEPS.REVIEW_RECEIPT)
      }
    } catch (err) {
      setStep(STEPS.ERROR)
      setErrorMsg(err.message || 'Something went wrong')
    }
  }

  // Drag and drop handlers
  const onDragOver = e => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)
  const onDrop = e => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }
  const onFileChange = e => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  function handleSaved() {
    setStep(STEPS.DONE)
    onSaved?.()
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>Upload Receipt</h1>

      {/* Drop zone (always visible when idle/error) */}
      {(step === STEPS.IDLE || step === STEPS.ERROR) && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-light)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--accent-glow)' : 'var(--bg-surface)',
            transition: 'all 200ms ease',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>⊕</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>
            Drop a receipt or statement image
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            JPEG, PNG, WebP, HEIC — photos, screenshots, scans
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <span className="btn btn-ghost" style={{ pointerEvents: 'none' }}>Browse files</span>
          </div>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={onFileChange} style={{ display: 'none' }} />
        </div>
      )}

      {/* Processing state */}
      {(step === STEPS.UPLOADING || step === STEPS.PARSING) && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          {previewUrl && (
            <img src={previewUrl} alt="Receipt preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', objectFit: 'contain', opacity: 0.6 }} />
          )}
          <div style={{ marginBottom: '0.75rem' }}>
            <Spinner />
          </div>
          <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{statusMsg}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: '0.5rem' }}>
            {step === STEPS.PARSING ? 'Claude is reading your image and extracting transaction data…' : 'Storing image securely…'}
          </div>
        </div>
      )}

      {/* Error state */}
      {step === STEPS.ERROR && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--red)' }}>⚠ Could not process image</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{errorMsg}</div>
          <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={reset}>Try again</button>
        </div>
      )}

      {/* Receipt review — single expense confirm */}
      {step === STEPS.REVIEW_RECEIPT && parsedData && (
        <ReceiptConfirm
          data={parsedData}
          imageUrl={imageUrl}
          previewUrl={previewUrl}
          onSaved={handleSaved}
          onCancel={reset}
        />
      )}

      {/* Statement review — multi-line modal is launched directly */}
      {step === STEPS.REVIEW_STATEMENT && parsedData && (
        <StatementReview
          items={parsedData.items || []}
          imageUrl={imageUrl}
          onSaved={handleSaved}
          onClose={reset}
        />
      )}

      {/* Done state */}
      {step === STEPS.DONE && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✓</div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--green)' }}>Expense saved!</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: '1.5rem' }}>View it in the Expenses tab or upload another.</div>
          <button className="btn btn-primary" onClick={reset}>Upload another</button>
        </div>
      )}

      {/* Manual entry shortcut */}
      {step === STEPS.IDLE && (
        <ManualEntryShortcut onSaved={handleSaved} />
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: '3px solid var(--border-light)',
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.8s linear infinite',
      margin: '0 auto',
    }} />
  )
}

// Inline spin keyframe via style tag
const styleEl = document.createElement('style')
styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`
document.head.appendChild(styleEl)

/**
 * ReceiptConfirm — shown after parsing a single receipt.
 * Displays extracted data in an editable form, user confirms to save.
 */
function ReceiptConfirm({ data, imageUrl, previewUrl, onSaved, onCancel }) {
  const [form, setForm] = useState({
    merchant: data.merchant || '',
    date: data.date || new Date().toISOString().slice(0, 10),
    amount: String(data.amount || ''),
    category: data.category || CATEGORIES[0],
    is_business: false,
    notes: data.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (!form.merchant.trim()) { setError('Merchant is required'); return }
    if (!form.amount || isNaN(Number(form.amount))) { setError('Valid amount is required'); return }

    setSaving(true)
    const { error: err } = await supabase.from('expenses').insert({
      date: form.date,
      merchant: form.merchant.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      is_business: form.is_business,
      notes: form.notes.trim() || null,
      source_type: 'receipt',
      image_url: imageUrl,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Preview */}
        {previewUrl && (
          <div style={{ flexShrink: 0 }}>
            <img src={previewUrl} alt="Receipt" style={{ width: 140, height: 180, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
          </div>
        )}

        {/* Form */}
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Review & confirm extracted data
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 2 }}>
              <label className="label">Merchant</label>
              <input className="input" value={form.merchant} onChange={e => set('merchant', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Amount ($)</label>
              <input className="input" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
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
            <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional context" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <input type="checkbox" id="rc_biz" checked={form.is_business} onChange={e => set('is_business', e.target.checked)} style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <label htmlFor="rc_biz" style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
              Flag as <strong style={{ color: 'var(--accent)' }}>business expense</strong>
            </label>
          </div>

          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={onCancel}>Discard</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : `Save — ${formatCurrency(parseFloat(form.amount) || 0)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ManualEntryShortcut({ onSaved }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No image? <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Enter expense manually</button>
      </div>
      {open && <ExpenseForm onSaved={() => { setOpen(false); onSaved() }} onClose={() => setOpen(false)} />}
    </>
  )
}
