# Ledger — Expense Tracker

A personal expense tracker with AI-powered receipt parsing. Upload photos of receipts or credit card statement screenshots and let Claude extract the data automatically.

## Features

- 📸 **AI Receipt Parsing** — drag-and-drop photos; Claude extracts merchant, date, amount, category
- 🧾 **Statement Review** — credit card statements parsed into line items; selectively import what you want
- 📊 **Dashboard** — monthly totals by category, business vs. personal split, 6-month trend
- 🏷️ **Business Flagging** — tag any expense as business or personal
- 🔍 **Filtering & Search** — filter by month, category, or business type
- 📥 **CSV Export** — export any filtered view to Excel-compatible CSV
- ✏️ **Manual Entry** — add or edit expenses without an image

## Tech Stack

- **Frontend**: React 18 + Vite 6
- **Styling**: Tailwind CSS v4
- **Database & Storage**: Supabase (PostgreSQL + Storage buckets)
- **AI**: Anthropic Claude API (claude-sonnet-4)
- **Charts**: Recharts
- **Deploy**: Netlify or Vercel (free tier)

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd expense-tracker
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the contents of `supabase/schema.sql`
3. This creates the `expenses` table, indexes, RLS policies, and the `expense-receipts` storage bucket

### 3. Get your API keys

**Supabase** (Settings → API):
- Project URL
- `anon` public key

**Anthropic** ([console.anthropic.com](https://console.anthropic.com)):
- Create an API key

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ANTHROPIC_API_KEY=sk-ant-your-key
```

> **Security note**: The Anthropic API key is used directly from the browser (appropriate for a personal single-user app). For a shared/public deployment, proxy the Claude call through a Supabase Edge Function to keep the key server-side.

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:5173

---

## Deployment (Vercel)

A `vercel.json` is included — Vercel auto-detects Vite so almost nothing to configure.

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Vercel auto-detects Vite and sets build command + output dir automatically
4. Before deploying, click **Environment Variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ANTHROPIC_API_KEY`
5. Click **Deploy**

You'll get a `yourproject.vercel.app` URL instantly. Bookmark it on Android — it works great as a mobile web app. Every `git push` to `main` triggers an automatic redeploy.

---

## Adding Categories

Edit `src/lib/claudeApi.js` — update the `CATEGORIES` array and `CATEGORY_COLORS` map.

## Supported Image Types

JPEG, PNG, WebP, HEIC, GIF — basically any photo from your phone camera, screenshot, or scanned document.

## CSV Export Format

| Date | Merchant | Amount | Category | Business | Source | Notes |
|------|----------|--------|----------|----------|--------|-------|
| 2026-03-15 | Delta Air Lines | 412.00 | Travel / Airfare / Hotel | Yes | receipt | |

---

## Roadmap Ideas

- [ ] Supabase Auth (email + Google OAuth) for proper user isolation
- [ ] Monthly budget targets with over/under alerts
- [ ] Receipt image viewer in the expense list
- [ ] Multi-page PDF statement support
- [ ] Recurring expense detection
- [ ] Annual summary / year-over-year comparison
