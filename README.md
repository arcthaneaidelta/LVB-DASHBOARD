# LVB Pulse — La Voute Beauty Academy LLC

**Client Demonstration Edition** — Interactive academy operations platform for La Voute Beauty Academy (City Terrace, Los Angeles, California).

## Key Capabilities

- **Public Landing Experience (`/`)**: Branded initial loader, editorial hero, 4-pillar operational overview, interactive 5-stage money loop, role explorer, and live preview driven by shared application state.
- **Role-Based Access Simulation (`/app`)**: 6 demo identities across 4 operational roles (`Owner`, `Instructor`, `Telemarketing`, `Staff`) with centralized RBAC guards and persistent identity/language switching.
- **Core Financial Engine (Phase 1)**:
  - Dynamic weekly due calculation: `due_w = (total - deposit - paid_before_week_w) / (weeks - w + 1)`
  - Fixed weekly payment plan overrides & behind-schedule calculations (Owner-only)
  - Sequential `LVB-000XX` receipt numbering & branded Navy/Gold/Ivory PDF receipts
  - Mobile-first Class Log (`P / A / C / E` one-tap attendance + inline collection)
  - Instructor Cash Handoff submission, Owner physical cash verification, variance flagging, and entry locking
  - Owner Dashboard, Accounting, Reconciliation, Daily Cash Report, and Reporting Center (PDF & CSV exports)
- **Studio Operations (Phase 2)**:
  - Missed Classes lifecycle (`Open → Scheduled → Completed → Owner Cleared`)
  - Studio Tours booking, show rate, and enrollment conversion
  - 101-product Inventory across 5 categories with `Order Now (≤5)` / `Reorder Soon (<10)` thresholds, China & Legacy Nails lead-time warnings, Owner valuation, and Counts-Only view for Instructors/Staff
  - Weekly Reports (private to sender + Owner management), Open Tasks, Owner Open Projects, Monthly Calendar (with hidden Owner-only meetings), Suggestions, Documents & Receipts, and Team & Access (including configurable Telemarketing balance policy).
- **Full English & Spanish Support**: Centralized EN/ES translation dictionary across the entire application and PDF exports.

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Netlify Deployment

Configured automatically via `netlify.toml`, `.nvmrc` (Node 20), and `public/_redirects`:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **SPA routing**: All routes redirect to `/index.html` (`200`)

> **Architecture Note**: This demonstration edition simulates roles and persistence locally in the browser (`localStorage`). Production deployment requires real authentication, server-side authorization, database row-level security, immutable audit trails, server-locked cash records, and automated encrypted backups.
