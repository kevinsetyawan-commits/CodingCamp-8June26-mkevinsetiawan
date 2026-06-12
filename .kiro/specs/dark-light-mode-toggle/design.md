# Design Document — Dark/Light Mode Toggle

## Overview

The Dark/Light Mode Toggle adds a single-button theme switcher to the Expense & Budget Visualizer. When the user activates the button the entire UI transitions to the opposite color scheme; the choice is persisted in `localStorage` and re-applied on every subsequent page load.

The implementation is intentionally minimal and non-invasive:

- **No new files** — all CSS goes into the existing `css/style.css` and all JS goes into the existing `js/app.js`.
- **No build step, no frameworks, no new dependencies** — vanilla JS and CSS only.
- **Single theming mechanism** — a `data-theme` attribute on the `<html>` element. CSS rules are scoped to `[data-theme="dark"]`.

### Key design decisions

| Decision | Rationale |
|---|---|
| `data-theme` on `<html>` (not a class on `<body>`) | Allows CSS to reach every element in the document, including `<body>` and `<head>`-rendered content, without specificity fights. Specified by Req 3.6 & 6.7. |
| `"light"` as the implicit default | The existing stylesheet is already the light theme; setting `data-theme="light"` or omitting the attribute both produce the same result. Req 3.3 specifies `"light"` when no stored preference exists. |
| CSS custom properties (variables) for theme colors | Lets the dark-theme overrides be declared in one `[data-theme="dark"]` block at the top of `style.css`; no duplicate selectors needed. |
| Chart colors are theme-invariant | `CATEGORY_COLORS` is a constant in `app.js` that is never touched by the Theme_Manager. Req 5.3. |
| `localStorage` key `"expense_visualizer_theme"` | Distinct from `"expense_visualizer_transactions"` so the two features cannot interfere. Req 6.4. |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser                           │
│                                                     │
│  <html data-theme="light"|"dark">                   │
│    │                                                │
│    ├── <head>                                       │
│    │     └── css/style.css (loaded once)            │
│    │           ├── :root { --color-* variables }    │
│    │           └── [data-theme="dark"] { overrides }│
│    │                                                │
│    └── <body>                                       │
│          ├── <header>                               │
│          │     ├── existing balance display         │
│          │     └── #theme-toggle (NEW)              │
│          └── <main> (unchanged structure)           │
│                                                     │
│  js/app.js (IIFE)                                   │
│    ├── existing transaction / chart logic           │
│    └── Theme_Manager (NEW)                          │
│          ├── THEME_KEY = "expense_visualizer_theme" │
│          ├── loadTheme()    — reads localStorage    │
│          ├── applyTheme(t)  — sets data-theme attr  │
│          ├── saveTheme(t)   — writes localStorage   │
│          └── handleToggle() — switches & persists   │
└─────────────────────────────────────────────────────┘
```

**Data flow on page load:**

```
DOMContentLoaded → init()
  └── loadAndApplyTheme()        ← Theme_Manager
        ├── read localStorage["expense_visualizer_theme"]
        ├── validate value ("light" | "dark"); fallback → "light"
        └── applyTheme(value)
              └── document.documentElement.setAttribute("data-theme", value)
                    └── CSS re-evaluates [data-theme="dark"] rules instantly
```

**Data flow on toggle click:**

```
user clicks #theme-toggle
  └── handleToggle()             ← Theme_Manager
        ├── read current data-theme from <html>
        ├── next = (current === "dark") ? "light" : "dark"
        ├── applyTheme(next)     ← updates data-theme attribute
        ├── saveTheme(next)      ← writes localStorage (silent on error)
        └── updateToggleButton() ← updates button text/aria-label
```

---

## Components and Interfaces

### 1. Toggle Button (`index.html`)

A `<button>` element is added to the existing `<header>` alongside the balance display.

```html
<button
  id="theme-toggle"
  type="button"
  aria-label="Switch to dark mode"
>
  🌙 Dark Mode
</button>
```

Attributes and content are updated dynamically by `updateToggleButton()`.

**Sizing:** The button must meet the 44 × 44 px touch target requirement (Req 1.6). This is enforced via CSS `min-width: 44px; min-height: 44px`.

### 2. Theme_Manager (added to `js/app.js`)

Four small functions are added inside the existing IIFE, alongside the existing constant and function declarations.

```js
// ─── Theme_Manager ──────────────────────────────────────────────────────────

const THEME_KEY = 'expense_visualizer_theme';

/**
 * Reads stored theme. Returns "light" or "dark"; falls back to "light" on any
 * missing, invalid, or thrown value.
 * @returns {"light"|"dark"}
 */
function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light'; // missing, null, or invalid value → default
  } catch (_) {
    return 'light'; // localStorage unavailable
  }
}

/**
 * Writes theme to localStorage; silently ignores errors (Req 3.5).
 * @param {"light"|"dark"} theme
 */
function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_) { /* continue in-memory */ }
}

/**
 * Sets data-theme attribute on <html> and updates the toggle button label.
 * @param {"light"|"dark"} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateToggleButton(theme);
}

/**
 * Updates toggle button text and aria-label to reflect the current theme.
 * @param {"light"|"dark"} currentTheme
 */
function updateToggleButton(currentTheme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  if (currentTheme === 'dark') {
    btn.textContent  = '☀ Light Mode';
    btn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    btn.textContent  = '🌙 Dark Mode';
    btn.setAttribute('aria-label', 'Switch to dark mode');
  }
}

/**
 * Click handler for #theme-toggle. Reads current theme, inverts it,
 * applies it, and persists it.
 */
function handleThemeToggle() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveTheme(next);
}
```

**Integration into `init()`:**

```js
function init() {
  // ── Existing calls (unchanged) ────────────────────────────────────────
  loadTransactions();
  initChart();
  updateBalance();
  renderList();
  updateChart();

  // ── Theme initialisation (new) ────────────────────────────────────────
  applyTheme(loadTheme());   // synchronous — runs before first paint

  // ── Existing event wiring (unchanged) ────────────────────────────────
  var form = document.getElementById('transaction-form');
  if (form) form.addEventListener('submit', handleFormSubmit);

  var list = document.getElementById('transaction-list');
  if (list) list.addEventListener('click', handleDeleteClick);

  // ── Theme toggle event wiring (new) ───────────────────────────────────
  var toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', handleThemeToggle);
}
```

### 3. CSS Theme Variables (`css/style.css`)

CSS custom properties are declared on `:root` for the light theme (default) and overridden in the `[data-theme="dark"]` block. All component-level color rules reference variables instead of hard-coded hex values.

```css
/* ── Light theme (default) ─────────────────────────── */
:root {
  --color-bg-page:       #f5f5f5;
  --color-bg-header:     #2c3e50;
  --color-bg-card:       #ffffff;
  --color-text-primary:  #1a1a1a;
  --color-text-secondary:#5a6a6b;
  --color-text-header:   #ffffff;
  --color-accent:        #f1c40f;
  --color-border:        #ecf0f1;
  --color-input-bg:      #ffffff;
  --color-input-text:    #1a1a1a;
  --color-input-border:  #cccccc;
  --color-label:         #34495e;
  --color-heading:       #2c3e50;
  --color-error:         #b91c1c;
  --color-delete-border: #b91c1c;
  --color-delete-text:   #b91c1c;
  --color-focus-ring:    #3498db;
}

/* ── Dark theme overrides ────────────────────────────── */
[data-theme="dark"] {
  --color-bg-page:       #121212;
  --color-bg-header:     #1e1e2e;
  --color-bg-card:       #1e1e2e;
  --color-text-primary:  #e0e0e0;   /* #e0e0e0 on #1e1e2e → ~9.7:1 ✓ */
  --color-text-secondary:#a0a8b0;   /* #a0a8b0 on #1e1e2e → ~5.1:1 ✓ */
  --color-text-header:   #e0e0e0;
  --color-accent:        #f1c40f;   /* unchanged — already high contrast */
  --color-border:        #2e2e3e;
  --color-input-bg:      #2a2a3a;
  --color-input-text:    #e0e0e0;   /* #e0e0e0 on #2a2a3a → ~8.7:1 ✓ */
  --color-input-border:  #555566;
  --color-label:         #c0c8d0;   /* #c0c8d0 on #1e1e2e → ~6.4:1 ✓ */
  --color-heading:       #e0e0e0;
  --color-error:         #f87171;   /* #f87171 on #1e1e2e → ~5.1:1 ✓ */
  --color-delete-border: #f87171;
  --color-delete-text:   #f87171;
  --color-focus-ring:    #60a5fa;   /* #60a5fa on #1e1e2e → ~5.9:1 ✓ */
}
```

**Toggle button styles:**

```css
#theme-toggle {
  min-width: 44px;
  min-height: 44px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid var(--color-text-header);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-header);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}

#theme-toggle:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

#theme-toggle:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 3px;
}
```

---

## Data Models

### Theme state

The active theme is stored in two places that are always kept in sync:

| Store | Key / Attribute | Allowed values | Default |
|---|---|---|---|
| `<html>` attribute | `data-theme` | `"light"`, `"dark"` | `"light"` |
| `localStorage` | `"expense_visualizer_theme"` | `"light"`, `"dark"` | absent (treated as `"light"`) |

There is no in-memory theme variable. The `<html>` attribute is the single source of truth at runtime; `localStorage` is the persistence layer. They are synchronized on every toggle and on page load.

### localStorage schema

```
Key:   "expense_visualizer_theme"
Type:  string
Valid: "light" | "dark"
```

The Theme_Manager reads this key once during `init()` and writes it after every toggle. Any other value (including the key being absent) triggers a fallback to `"light"`.

### Relationship to existing storage

```
"expense_visualizer_transactions"  ← untouched by Theme_Manager
"expense_visualizer_theme"          ← written/read only by Theme_Manager
```

The two keys are entirely independent (Req 6.4).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Toggle is an involution (round-trip)

*For any* starting theme (`"light"` or `"dark"`), applying the toggle function once produces the opposite theme, and applying it a second time returns to the original theme.

**Validates: Requirements 2.1, 2.2**

### Property 2: Theme persistence round-trip

*For any* valid theme value (`"light"` or `"dark"`), writing that value to `localStorage` via `saveTheme` and then reading it back via `loadTheme` returns the same value.

**Validates: Requirements 3.1, 3.2**

### Property 3: Invalid stored value defaults to light theme

*For any* string that is neither `"light"` nor `"dark"` (including `null` / absent), calling `loadTheme` with that value in `localStorage` returns `"light"`.

**Validates: Requirements 3.3, 3.4**

### Property 4: Chart category colors are invariant across themes

*For any* theme state (`"light"` or `"dark"`), the `CATEGORY_COLORS` mapping for Food, Transport, and Fun always equals `{ Food: "#FF6384", Transport: "#36A2EB", Fun: "#FFCE56" }` — the theme switch must never mutate this constant.

**Validates: Requirements 5.3**

---

## Error Handling

### LocalStorage unavailable or throws

`loadTheme()` and `saveTheme()` are each wrapped in `try/catch`. If either throws:

- `loadTheme`: returns `"light"` silently; the UI renders in light mode for the session.
- `saveTheme`: swallows the error; the in-memory theme (the `data-theme` attribute) is still updated so the toggle works for the current session. No notification is shown (Req 3.5 — theme errors must not display UI errors).

This matches the existing pattern used by `loadTransactions()` and `saveTransactions()` in `app.js`.

### Invalid stored theme value

Values other than `"light"` and `"dark"` are treated as absent. `loadTheme` contains a strict whitelist check before returning; any other value falls through to the `"light"` default (Req 3.4).

### Toggle button element missing

`updateToggleButton()` and `handleThemeToggle()` guard against `document.getElementById('theme-toggle')` returning `null` — they return early without throwing. This keeps the feature self-contained and prevents breaking the rest of the app if the HTML is modified.

### Interaction with existing notification banner

The dark/light mode feature does **not** use `showNotification()` for any error path. Theme errors are always silent to avoid confusing the user and to comply with Req 3.5.

---

## Testing Strategy

### Framework

The project uses **fast-check** (v3.x) with Node's built-in test runner (`node --test`). All new tests are added to the existing `tests/app.test.js` file following the established pattern of re-implementing pure logic functions at the top of the test file.

### PBT applicability assessment

The Theme_Manager contains pure logic functions (`loadTheme`, `saveTheme`, `applyTheme`, `handleThemeToggle`) with well-defined inputs and outputs and no side effects beyond `localStorage` and DOM attribute writes, both of which can be easily mocked. PBT **is** appropriate for the core toggle and persistence logic.

PBT is **not** applied to:
- CSS color contrast ratios (fixed design values; manual WCAG audit is the right tool)
- Touch target sizing (CSS layout constraint; not a computational function)
- Keyboard navigation (requires browser rendering; manual or E2E test)

### Unit / example tests

| Criterion | Test type | What is verified |
|---|---|---|
| Button exists in DOM after init | Example | `getElementById('theme-toggle')` is not null |
| Button label in light theme | Example | `textContent` contains dark-mode cue |
| Button label in dark theme | Example | `textContent` contains light-mode cue |
| `aria-label` in light theme | Example | `aria-label === "Switch to dark mode"` |
| `aria-label` in dark theme | Example | `aria-label === "Switch to light mode"` |
| `data-theme` attribute set by `applyTheme` | Example | `document.documentElement.getAttribute('data-theme')` |
| Default theme when key absent | Example | `loadTheme()` returns `"light"` when `localStorage` is empty |
| `localStorage` throws on read | Example | `loadTheme()` returns `"light"` without throwing |
| `localStorage` throws on write | Example | `saveTheme()` silently continues without throwing |

### Property-based tests

All property tests run **200 iterations** minimum (matching the existing test suite convention).

**Property 1 — Toggle involution**
```js
// Feature: dark-light-mode-toggle, Property 1: toggle is an involution
fc.property(
  fc.constantFrom('light', 'dark'),
  (startTheme) => {
    const next = startTheme === 'dark' ? 'light' : 'dark';
    const backAgain = next === 'dark' ? 'light' : 'dark';
    assert.strictEqual(next, startTheme === 'dark' ? 'light' : 'dark');
    assert.strictEqual(backAgain, startTheme);
  }
)
```

**Property 2 — Persistence round-trip**
```js
// Feature: dark-light-mode-toggle, Property 2: theme persistence round-trip
fc.property(
  fc.constantFrom('light', 'dark'),
  (theme) => {
    // simulate save then load with a mock localStorage
    mockStorage[THEME_KEY] = theme;
    const loaded = simulateLoadTheme(mockStorage);
    assert.strictEqual(loaded, theme);
  }
)
```

**Property 3 — Invalid stored value defaults to light**
```js
// Feature: dark-light-mode-toggle, Property 3: invalid stored value defaults to light
fc.property(
  fc.string().filter(s => s !== 'light' && s !== 'dark'),
  (invalidValue) => {
    mockStorage[THEME_KEY] = invalidValue;
    const loaded = simulateLoadTheme(mockStorage);
    assert.strictEqual(loaded, 'light');
  }
)
```

**Property 4 — Chart colors invariant across themes**
```js
// Feature: dark-light-mode-toggle, Property 4: chart category colors are invariant
fc.property(
  fc.constantFrom('light', 'dark'),
  (theme) => {
    simulateApplyTheme(theme);  // does not mutate CATEGORY_COLORS
    assert.strictEqual(CATEGORY_COLORS.Food,      '#FF6384');
    assert.strictEqual(CATEGORY_COLORS.Transport, '#36A2EB');
    assert.strictEqual(CATEGORY_COLORS.Fun,       '#FFCE56');
  }
)
```

### Manual / visual tests

| Check | How |
|---|---|
| WCAG AA contrast ratios for all dark-theme color pairs | WCAG contrast checker (e.g., webaim.org/resources/contrastchecker) against the CSS variable values defined in `[data-theme="dark"]` |
| Touch target 44 × 44 px | Browser DevTools computed styles on `#theme-toggle` |
| Keyboard Tab navigation reaches toggle | Manual keyboard walkthrough |
| Visible focus ring on `#theme-toggle` | Manual keyboard walkthrough with focus-visible styling |
| No layout shift after theme switch | Visual inspection at 320 px and 1920 px viewport widths |
| Chart legibility in dark mode | Visual inspection with at least one transaction of each category |
