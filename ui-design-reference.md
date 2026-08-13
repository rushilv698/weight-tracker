# UI Design Reference Library

## Source: beautifului.dev
"Beautiful UI for AI-native interfaces" — MIT licensed, copy-paste components.
Use these patterns whenever building apps to make them look modern, classy, and polished.

---

## Component Patterns

### 1. Loading States
- Pixel-grid loader with shimmer effect + elapsed time counter
- Variants: Drive (progress bar), Dots (bouncing), Orbit (spinning)
- Always show elapsed time for perceived performance

### 2. Thinking / Processing States
- Expandable trace panels showing system activity
- Steps, reasoning, search, coding — each collapsible
- Subtle animation on expand/collapse

### 3. Streaming Text
- Word-by-word appearance with cursor animation
- Inline source chips (favicon + domain, clickable)
- Follow-up suggestions as pill buttons below response

### 4. Approval / Confirmation Cards
- Human-in-the-loop cards with radio-style options
- Clean card with question + 2-4 selectable option rows
- Selected state has accent highlight

### 5. Tool Chips
- Compact inline chips for tool/action calls
- "4 tool calls, 2 messages" style compact summaries
- Small, rounded, muted background

### 6. Task Rows / Status Lists
- Live status: running (spinner), failed (red), completed (green check)
- Sub-items with progress ("12/12"), percentages ("68%")
- Capsule and List variants
- Status chips: colored dots + labels

### 7. Chat Composer
- Tabbed chat panel (multiple context tabs)
- Reasoning replies with tool usage timing ("for 4s")
- Composer at bottom with input + send

### 8. Prompt Bar / Input
- @ mentions for sources, / commands, model picker
- Variants: Vanilla (simple), Rounded, Pill
- Voice/dictation button, clean border, subtle background

### 9. Recommendation Cards
- Suggestion with confidence meter (low/medium/high)
- Primary action + alternatives listed below
- Confidence bar with gradient fill
- Accept/Reject buttons

### 10. Context Cards
- Knowledge chunks with source attribution
- Character count, file type badge (PDF, CSV)
- Source filename below content

### 11. Diff Table
- Tabular format for proposed edits
- Strikethrough removed, highlight added
- Row-level change indicators (green=new, red=removed)

### 12. Records Table (CRM-style)
- Tags as colored pills
- Connection strength indicators
- Sortable columns, avatar initials, external links
- Footer with counts and averages

### 13. Filter Table
- Status filter chips at top (All, To do, In Progress, Completed)
- Active chip highlighted, table updates on filter change
- Status column with colored chips

### 14. Sidebar Navigation
- Workspace name + subtitle
- Quick search shortcut
- Section items with badge counts
- Nested sub-items

### 15. Search / Command Palette
- Full-width search with live filtering
- Recent/suggested clickable rows
- Empty state illustration, keyboard shortcut hints

### 16. Insight Cards
- Paged carousel with dots
- Metric cards: % change + dollar amounts
- Color-coded: green positive, red negative
- Embedded sparkline/trend chart
- Action suggestion button

### 17. Code Block
- Syntax-highlighted with file name + language badge
- Copy button, line-by-line streaming animation
- Dark background, monospace font

### 18. Fine-tune / Inspector Card
- Property inspector with labeled inputs
- W/H/Radius/Opacity sliders
- Type dropdown, "Adjust" action button

### 19. Selection Actions
- Highlight text -> floating toolbar
- Actions: Explain, Improve, Shorten, Tone, Grammar
- Pill-shaped buttons in horizontal row

---

## General Design Principles

- **Glassmorphism**: Semi-transparent backgrounds + backdrop blur
- **Subtle animations**: Fade-in, slide-up, shimmer effects on everything
- **Compact density**: Show more with less space
- **Color-coded status**: Green=success, Amber=warning, Red=error, Blue/Purple=info
- **Rounded corners**: 8-16px border radius everywhere
- **Dark mode first**: Dark backgrounds, light text, accent colors
- **Micro-interactions**: Hover, press, transition on every interactive element
- **Typography hierarchy**: Bold for labels, lighter for secondary
- **Spacing rhythm**: 4/8/12/16px consistent scale
- **Accent gradients**: Purple-to-cyan, rose-to-orange for CTAs

---

## CSS Snippet Reference

```css
/* Glassmorphism card */
.glass-card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 16px;
}

/* Shimmer loading effect */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.shimmer {
  background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* Status chips */
.chip { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.chip-success { background: rgba(52,211,153,0.12); color: #34d399; }
.chip-warning { background: rgba(251,191,36,0.12); color: #fbbf24; }
.chip-error { background: rgba(239,68,68,0.12); color: #ef4444; }
.chip-info { background: rgba(129,140,248,0.12); color: #818cf8; }

/* Smooth page transitions */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeSlideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }

/* Gradient CTA button */
.cta-btn {
  background: linear-gradient(135deg, #a78bfa, #22d3ee);
  border: none; border-radius: 12px;
  color: #fff; font-weight: 700;
  padding: 10px 20px;
  transition: all 0.2s;
}
.cta-btn:active { transform: scale(0.96); opacity: 0.85; }

/* Confidence meter */
.confidence-bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.06); overflow: hidden; }
.confidence-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.confidence-high { background: linear-gradient(90deg, #34d399, #22d3ee); }
.confidence-mid { background: linear-gradient(90deg, #fbbf24, #fb923c); }
.confidence-low { background: linear-gradient(90deg, #ef4444, #fb7185); }

/* Floating action toolbar */
.action-toolbar {
  display: flex; gap: 6px;
  padding: 6px; border-radius: 12px;
  background: rgba(20,20,45,0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.action-pill {
  padding: 6px 14px; border-radius: 20px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: #9d9db8; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.action-pill:hover { background: rgba(255,255,255,0.12); color: #eeeef2; }
```
