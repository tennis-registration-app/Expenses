export const CATEGORIES = [
  'Dining / Restaurants',
  'Travel / Airfare / Hotel',
  'Entertainment',
  'Business / Professional',
  'Meetings',
  'Auto',
  'Dues',
  'Other',
]

export const CATEGORY_COLORS = {
  'Dining / Restaurants': '#f97316',
  'Travel / Airfare / Hotel': '#60a5fa',
  'Entertainment': '#a78bfa',
  'Business / Professional': '#c9a96e',
  'Meetings': '#34d399',
  'Auto': '#fb7185',
  'Dues': '#fbbf24',
  'Other': '#9d9aaa',
}

/**
 * Send an image to Claude for structured extraction.
 * Handles both single receipts and multi-line credit card statements.
 *
 * @param {string} imageBase64 - Base64-encoded image data (without data URI prefix)
 * @param {string} mimeType    - e.g. "image/jpeg", "image/png", "image/webp"
 * @returns {Promise<{source_type: 'receipt'|'statement', ...}>}
 */
export async function parseReceiptImage(imageBase64, mimeType) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY in .env')

  const prompt = `Analyze this image carefully. It may be:
1. A single receipt or invoice (one transaction)
2. A credit card statement or bank statement screenshot (multiple transactions)

Respond ONLY with valid JSON — no markdown fences, no explanation, no preamble.

If it is a SINGLE RECEIPT or INVOICE:
{
  "source_type": "receipt",
  "merchant": "Exact merchant name",
  "date": "YYYY-MM-DD",
  "amount": 0.00,
  "category": "one of: ${CATEGORIES.join(' | ')}",
  "notes": "any useful detail (optional, leave empty string if none)"
}

If it is a CREDIT CARD STATEMENT or BANK STATEMENT with multiple transactions:
{
  "source_type": "statement",
  "items": [
    {
      "merchant": "Merchant name",
      "date": "YYYY-MM-DD",
      "amount": 0.00,
      "category": "one of: ${CATEGORIES.join(' | ')}",
      "notes": ""
    }
  ]
}

Rules:
- Use positive numbers for charges/debits, negative for credits/refunds
- Choose the most specific matching category; use "Other" only as last resort
- For dates, prefer the transaction date over posting date; use today if unclear
- Extract ALL visible transactions from statements — do not skip any
- If the image is not readable or is not a financial document, return: {"source_type": "error", "message": "explain why"}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            mimeType === 'application/pdf'
              ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
              : { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  // Strip any accidental markdown fences
  const clean = text.replace(/```(?:json)?/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${clean.slice(0, 200)}`)
  }
}

/**
 * Convert a File object to a base64 string (without the data URI prefix).
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      // Strip the "data:image/jpeg;base64," prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Format a number as USD currency.
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

/**
 * Format a date string (YYYY-MM-DD) for display.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

/**
 * Get YYYY-MM for a date string, or today's month.
 */
export function getYearMonth(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 7)
  return dateStr.slice(0, 7)
}
