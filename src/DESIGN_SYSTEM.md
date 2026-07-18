# src/DESIGN_SYSTEM.md
# Injected into: FRONTEND and FULLSTACK tasks.
# The design law for Vaishu. No vibe-coding defaults. Every decision is deliberate.
#
# AESTHETIC: Dense study tool. Linear/Notion calm. High-signal, low-noise.
# Not a SaaS landing page. Not a purple AI startup. A serious tool students open every morning.

---

## DESIGN PRINCIPLES

1. **Information density over whitespace theatre.** Students are reading articles, not admiring
   space between cards. Padding is purposeful, not decorative.
2. **One colour does the work.** The accent colour (stone-900 / pure near-black) is used
   sparingly. Colour communicates importance — if everything is coloured, nothing is.
3. **Type carries the hierarchy.** Weight and size differences do the work that colour
   usually does in vibe-coded UIs. No gradient text. No hero display fonts on functional screens.
4. **The importance system is the signature.** Instead of pill badges, high/medium/low items
   use a left border stripe — like a highlighter on a textbook page. This is the single
   distinctive element. Everything else is quiet.
5. **No rounded-xl on everything.** Rounded corners are 6px (inputs, tags) or 8px (cards).
   Nothing is rounder than that. Full-radius (pill) is reserved for the exam-type filter tabs only.

---

## COLOUR TOKENS

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals — the entire UI lives here
        ink: {
          950: '#0a0a0a',   // headings, primary text
          800: '#1c1c1e',   // secondary text
          500: '#6b7280',   // muted text, placeholders
          300: '#d1d5db',   // borders, dividers
          100: '#f3f4f6',   // subtle backgrounds, hover states
          50:  '#f9fafb',   // page background
        },

        // Accent — used ONLY for interactive states and the active nav indicator
        accent: {
          DEFAULT: '#18181b',   // near-black — primary buttons, active states
          hover:   '#27272a',   // slightly lighter on hover
        },

        // Importance stripes — left border accent only (not background fills)
        stripe: {
          high:   '#dc2626',   // red-600
          medium: '#f59e0b',   // amber-500
          low:    '#22c55e',   // green-500
        },

        // Importance backgrounds — very faint tint behind the stripe items
        tint: {
          high:   '#fff5f5',
          medium: '#fffbf0',
          low:    '#f0fdf4',
        },

        // Exam type — tab indicator only
        exam: {
          banking:  '#2563eb',   // blue-600
          upsc:     '#7c3aed',   // violet-600
          ssc:      '#059669',   // emerald-600
          defence:  '#dc2626',   // red-600
          railway:  '#d97706',   // amber-600
          all:      '#18181b',   // near-black
        },
      },

      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Tight, purposeful scale — nothing in between
        '2xs': ['11px', { lineHeight: '16px', letterSpacing: '0.03em' }],
        xs:    ['12px', { lineHeight: '18px' }],
        sm:    ['13px', { lineHeight: '20px' }],
        base:  ['14px', { lineHeight: '22px' }],
        md:    ['15px', { lineHeight: '24px' }],
        lg:    ['17px', { lineHeight: '26px', fontWeight: '500' }],
        xl:    ['20px', { lineHeight: '28px', fontWeight: '600' }],
        '2xl': ['24px', { lineHeight: '32px', fontWeight: '600' }],
      },

      borderRadius: {
        none: '0',
        sm:   '4px',
        DEFAULT: '6px',   // inputs, tags, small elements
        md:   '8px',      // cards, modals, dropdowns
        full: '9999px',   // exam type filter pills ONLY
      },

      spacing: {
        // 4px grid — all spacing must be a multiple of 4
        // Use Tailwind's default 4px base (p-1=4px, p-2=8px, p-3=12px, p-4=16px, etc.)
        // No half-values like p-1.5 except for very tight inline elements
      },

      boxShadow: {
        card:  '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        modal: '0 8px 30px rgb(0 0 0 / 0.12)',
        none:  'none',
      },
    },
  },
};
```

---

## TYPOGRAPHY SYSTEM

```
Page title (h1):    text-2xl text-ink-950 font-semibold tracking-tight
Section label:      text-2xs text-ink-500 font-medium uppercase tracking-widest
Card title:         text-base text-ink-950 font-medium
Body / detail:      text-sm text-ink-800 leading-relaxed
Muted / meta:       text-xs text-ink-500
Mono (dates, ids):  font-mono text-xs text-ink-500
```

**Weights used:** 400 (body), 500 (labels, medium emphasis), 600 (headings, buttons).
**Weight 700+ is never used.** Bold screams; 600 leads.

---

## THE IMPORTANCE STRIPE SYSTEM (signature element)

This replaces pill badges. A left border stripe + very faint background tint.
Used on every daily affairs item card.

```jsx
// DailyItemCard — importance stripe pattern
const stripeClass = {
  high:   'border-l-2 border-stripe-high   bg-tint-high',
  medium: 'border-l-2 border-stripe-medium bg-tint-medium',
  low:    'border-l-2 border-stripe-low    bg-tint-low',
};

<div className={`rounded-md p-3 ${stripeClass[item.importance]}`}>
  <p className="text-base text-ink-950 font-medium">{item.title}</p>
  <p className="text-sm text-ink-800 mt-1 leading-relaxed">{item.detail}</p>
  <div className="flex flex-wrap gap-1 mt-2">
    {item.tags.map(tag => <Tag key={tag} label={tag} />)}
  </div>
</div>
```

The stripe is the only colour on the card. No coloured text, no icon, no pill badge.
The eye immediately reads red = pay close attention, amber = note this, green = FYI.

---

## UI COMPONENTS

### Button
```jsx
// Variants: primary | secondary | ghost | danger
// Sizes: sm | md (default) | lg

// primary — near-black fill, white text
'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] transition-all duration-100'

// secondary — bordered, no fill
'bg-white text-ink-950 border border-ink-300 hover:bg-ink-100 transition-colors'

// ghost — no border, no fill
'text-ink-500 hover:text-ink-950 hover:bg-ink-100 transition-colors'

// danger — red fill
'bg-red-600 text-white hover:bg-red-700 transition-colors'

// Sizes:
// sm:  h-7  px-3 text-xs  rounded
// md:  h-9  px-4 text-sm  rounded
// lg:  h-11 px-5 text-md  rounded-md

// Loading state: opacity-50 cursor-not-allowed + Spinner (same colour as text, inline left)
// Disabled state: opacity-40 cursor-not-allowed (no hover effect)
```

### Input / Textarea
```
h-9 w-full px-3 text-sm text-ink-950 bg-white
border border-ink-300 rounded
placeholder:text-ink-500
focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
transition-colors
```

No custom focus rings with brand colours — the near-black ring is clean and accessible.

### Card
```
bg-white border border-ink-300 rounded-md shadow-card p-4
```

Not `rounded-xl`. Not `shadow-lg`. The card is a quiet container, not a statement.

### Tag (for item.tags)
```
inline-flex items-center px-2 py-0.5
text-2xs font-medium text-ink-500
bg-ink-100 rounded
```

Tags are muted. They are metadata, not highlights.

### Spinner
```jsx
// Tailwind: animate-spin rounded-full border-2 border-ink-300 border-t-ink-950
// sm: w-3.5 h-3.5 | md: w-5 h-5 | lg: w-6 h-6
```

Near-black top segment on light grey ring. No coloured spinners.

### ErrorMessage
```
flex items-start gap-3 p-3
bg-red-50 border border-red-200 rounded-md
text-sm text-red-700
```

### EmptyState
```
flex flex-col items-center justify-center py-16 text-center
[icon: text-3xl mb-3]
[title: text-md text-ink-950 font-medium]
[description: text-sm text-ink-500 mt-1 max-w-xs]
[action button: mt-4 secondary variant]
```

### Modal
```
// Overlay: fixed inset-0 bg-black/40 backdrop-blur-sm
// Panel: bg-white rounded-md shadow-modal p-6 w-full max-w-md mx-auto mt-20
// Header: text-lg text-ink-950 font-semibold
// Close: top-right ghost button
```

---

## EXAM TYPE FILTER (Tabs)

This is the one place full-radius pills are used.
The dot colour signals which exam type is active (not a filled pill background).

```jsx
// Tab strip — horizontally scrollable, no wrapping
<div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
  {tabs.map(tab => (
    <button
      key={tab.id}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        whitespace-nowrap transition-colors
        ${activeTab === tab.id
          ? 'bg-ink-950 text-white'
          : 'bg-ink-100 text-ink-500 hover:text-ink-950 hover:bg-ink-200'}
      `}
    >
      {tab.label}
    </button>
  ))}
</div>
```

Active state: filled near-black pill, white text. Nothing else.

---

## APP LAYOUT

### Desktop (≥768px)
```
┌──────────────────────────────────────────────┐
│ sidebar (w-52, fixed)  │  main content        │
│                        │                      │
│  Logo                  │  [page header]       │
│  ──────                │  [exam filter]       │
│  Daily         ←active │  [content]           │
│  Bookmarks             │                      │
│  Flashcards            │                      │
│  Quiz                  │                      │
│  Dashboard             │                      │
│  Archive               │                      │
│  Search                │                      │
│  Monthly               │                      │
│  ──────                │                      │
│  Settings              │                      │
│  ──────                │                      │
│  🔥 7 days             │                      │
└──────────────────────────────────────────────┘
```

Sidebar: `w-52 border-r border-ink-300 bg-white fixed top-0 left-0 h-screen flex flex-col`
Main: `ml-52 min-h-screen bg-ink-50`
Content max-width: `max-w-2xl mx-auto px-6 py-6`

### Mobile (<768px)
Sidebar hidden. Bottom navigation bar (5 icons):
`Daily · Bookmarks · Quiz · Dashboard · Settings`

Bottom nav: `fixed bottom-0 inset-x-0 h-14 bg-white border-t border-ink-300 flex`

### Sidebar nav item
```
// Default
'flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-500
hover:text-ink-950 hover:bg-ink-100 transition-colors'

// Active
'flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-950
bg-ink-100 font-medium'

// Active indicator: left border stripe inside the item
'border-l-2 border-accent pl-[10px]'
```

No icon colour changes on active. Just weight + background shift.

### Streak display (sidebar footer)
```
<div className="px-3 py-2 text-sm text-ink-500">
  <span className="text-ink-950 font-medium">🔥 {current}</span> day streak
</div>
```

Not a banner. Not a card. One quiet line at the bottom of the sidebar.

---

## FLASHCARD DESIGN

Card: `bg-white border border-ink-300 rounded-md shadow-card`
Aspect ratio: `aspect-[3/2]` on desktop, `aspect-[4/3]` on mobile
Front face: item title — `text-lg text-ink-950 font-medium text-center px-6`
Back face: item detail — `text-sm text-ink-800 leading-relaxed text-center px-6`
Flip trigger: tap/click anywhere on card
Progress: `text-xs text-ink-500` top-right — "3 / 12"
Navigation arrows: ghost buttons, left and right of card

CSS flip (index.css):
```css
.card-scene { perspective: 1000px; }
.card-inner { transition: transform 0.35s ease; transform-style: preserve-3d; }
.card-inner.flipped { transform: rotateY(180deg); }
.card-face { backface-visibility: hidden; position: absolute; inset: 0; }
.card-back { transform: rotateY(180deg); }
```

No JS animation libraries. Pure CSS.

---

## CHART DESIGN (Recharts)

Recharts uses SVG — Tailwind classes don't apply inside SVG. Use these hex values directly.

```js
const CHART = {
  line:    '#18181b',   // ink-950 — score trend line
  grid:    '#e5e7eb',   // gray-200 — grid lines (very faint)
  axis:    '#9ca3af',   // gray-400 — axis labels
  tooltip: { bg: '#ffffff', border: '#d1d5db' },

  // Category accuracy bars — one colour per category (consistent across sessions)
  bars: ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'],

  // Weak category highlight — lowest accuracy bar
  barWeak: '#fee2e2',   // very faint red tint behind the bar
};
```

No filled area charts. Use line charts only for score trend — area fill makes it feel heavy.

---

## WHAT NOT TO DO (enforced by builder and auditor)

- No `rounded-xl` or `rounded-2xl` — max is `rounded-md` (8px)
- No gradient backgrounds or gradient text
- No glassmorphism (`backdrop-blur` on cards — only on modal overlay)
- No `shadow-xl` or `shadow-2xl` — use `shadow-card` only
- No coloured headings — headings are always `text-ink-950`
- No pill badges for importance — use the stripe system
- No full-width coloured banners or alert bars (ErrorMessage component only)
- No animations on page entry (no fade-in, slide-in for content blocks — only the flashcard flip and button press scale)
- No hardcoded hex values in JSX — all colours from the token system above
- No inline `style={}` attributes unless documenting a CSS variable for Recharts
