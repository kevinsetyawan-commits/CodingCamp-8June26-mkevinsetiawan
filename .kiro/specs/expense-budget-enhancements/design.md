# Design Document — Expense & Budget Enhancements

## Overview

This document describes the technical design for three enhancements to the existing Expense & Budget Visualizer SPA:

1. **Dark/Light Mode Toggle** — a CSS custom-property–driven theming system controlled by a `data-theme` attribute on `<html>`, persisted to `localStorage`.
2. **Custom Categories** — user-defined category names layered on top of the three built-ins, stored in `localStorage`, reflected everywhere categories appear (dropdown, chart, validation).
3. **Monthly Summary View** — a collapsible panel that groups transactions by calendar month and shows a per-category breakdown for the user-selected month.

### Key Design Constraints

- Modify **only** `js/app.js`, `css/style.css`, and `index.html`.
- No new libraries, build tools, or backend services.
- Remain within the existing IIFE (`(function(){ … })()`) architecture.
- All changes are purely client-side with `localStorage` as the persistence layer.
- The existing `STORAGE_KEY` data contract must not be broken.

---

## Architecture

The app follows a straightforward **event-driven, module-less SPA** pattern inside a single IIFE. The three enhancements slot into this pattern without introducing new abstractions.

```
┌────────────────────────────────────────────────────────┐
│                      IIFE (app.js)                     │
│                                                        │
│  Constants   ──  CATEGORIES (built-in + custom)        │
│  State       ──  transactions[], customCategories[],   │
│                  currentTheme, currentSummaryMonth     │
│  Storage     ──  load/save for each localStorage key   │
│  Renderers   ──  updateBalance, renderList, updateChart│
│                  renderCategoryManager,                │
│                  renderMonthlySummary,                 │
│                  updateCategoryDropdown                │
│  Handlers    ──  handleFormSubmit, handleDeleteClick,  │
│                  handleThemeToggle,                    │
│                  handleAddCategory, handleDeleteCategory│
│                  handleMonthChange                     │
│  init()      ──  wires everything together             │
└────────────────────────────────────────────────────────┘
```

### Data flow

```
localStorage ──► loadTransactions()  ──► transactions[]
localStorage ──► loadCustomCategories() ──► customCategories[]
localStorage ──► loadTheme()            ──► applyTheme()

User action ──► handler ──► mutate state ──► persist ──► re-render
```

### Theme system (CSS custom properties)

Rather than swapping stylesheets, a `data-theme` attribute is set on `<html>` and CSS variables defined for both values cascade down to all elements. Chart.js colors are updated programmatically when the theme changes.

```
html[data-theme="light"] { --bg: #f5f5f5; --surface: #fff; --text: #1a1a1a; … }
html[data-theme="dark"]  { --bg: #1a1a2e; --surface: #16213e; --text: #e0e0e0; … }
```

---

## Components and Interfaces

### 1. Theme Toggle

**HTML addition** (inside `<header>`):
```html
<button id="theme-toggle" aria-label="Switch to dark mode" title="Toggle theme">
  <span id="theme-icon">🌙</span>
</button>
```

**JS functions:**
- `loadTheme() → "light" | "dark"` — reads `THEME_KEY` from localStorage; falls back to `"light"`.
- `applyTheme(theme)` — sets `document.documentElement.dataset.theme = theme`, updates the toggle button's `aria-label` and icon, and updates `Chart.js` plugin options to use theme-appropriate colors.
- `saveTheme(theme)` — writes to `THEME_KEY`; silently swallows errors (Req 4.6).
- `handleThemeToggle()` — flips theme, calls `saveTheme`, calls `applyTheme`, calls `updateChart()` to repaint the chart with correct colors.

**CSS:** All color declarations on `header`, `body`, `section`, inputs, etc. are replaced with `var(--bg)`, `var(--text)`, etc. The `data-theme` attribute selector provides the two token sets.

---

### 2. Custom Categories

**State:**
```js
/** @type {string[]} */
let customCategories = [];
```

**Derived helper** (replaces the static `CATEGORIES` array in any logic that needs the full list):
```js
function getAllCategories() {
  return BUILTIN_CATEGORIES.concat(customCategories);
}
```
`BUILTIN_CATEGORIES` remains the frozen constant `['Food', 'Transport', 'Fun']`.

**Color assignment** for custom categories: a pre-defined palette of 20 visually distinct colors, none matching `#FF6384`, `#36A2EB`, or `#FFCE56`. Colors are assigned by index position in `customCategories` so the same category always gets the same color during a session (and across reloads, since order is persisted).

```js
const CUSTOM_CATEGORY_PALETTE = [
  '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#7FC97F',
  '#BEAED4', '#FDC086', '#386CB0', '#F0027F', '#BF5B17',
  '#666666', '#1B9E77', '#D95F02', '#7570B3', '#E7298A',
  '#66A61E', '#E6AB02', '#A6761D', '#A6CEE3', '#B2DF8A'
];
```

**HTML addition** (inside `#form-section`, below the `<form>`):
```html
<div id="category-manager" aria-label="Custom categories">
  <h3>Custom Categories</h3>
  <div class="form-group">
    <label for="custom-category-input">New Category Name</label>
    <input type="text" id="custom-category-input" maxlength="50"
           placeholder="e.g. Healthcare" autocomplete="off">
    <span class="error-msg" id="custom-category-error" aria-live="polite"></span>
  </div>
  <button type="button" id="add-category-btn">Add Category</button>
  <ul id="custom-category-list" aria-label="Custom category list"></ul>
</div>
```

**JS functions:**
- `loadCustomCategories()` — reads `CATEGORIES_KEY`; silently falls back to `[]` on any failure.
- `saveCustomCategories()` — writes `customCategories` to `CATEGORIES_KEY`; on failure shows an inline error in `#custom-category-error` (Req 4.5) without reverting in-memory state.
- `validateCustomCategory(name, currentList)` → `string | null` — returns an error message or `null` on success. Checks: non-empty after trim, ≤ 50 chars, no case-insensitive duplicate in `currentList`, total count ≤ 20.
- `renderCategoryManager()` — clears and re-renders `#custom-category-list` with one `<li>` per custom category, each containing a delete `<button aria-label="Delete {name}">`.
- `updateCategoryDropdown()` — clears `<select id="category">` and repopulates: placeholder option, then built-ins, then custom categories in order.
- `handleAddCategory()` — validates, updates state, calls `saveCustomCategories()`, then `renderCategoryManager()` + `updateCategoryDropdown()`.
- `handleDeleteCategory(name)` — removes from `customCategories`, calls `saveCustomCategories()`, then `renderCategoryManager()` + `updateCategoryDropdown()`. Existing transactions referencing that category are untouched.
- The existing `isValidCategory(cat)` is updated to call `getAllCategories()` instead of `CATEGORIES`.

---

### 3. Monthly Summary View

**State:**
```js
/** @type {string | null} */  // "YYYY-MM" format
let currentSummaryMonth = null;
```

**HTML addition** (new `<section>` in `<main>`, spanning both columns on desktop):
```html
<section id="summary-section" aria-labelledby="summary-heading" hidden>
  <h2 id="summary-heading">Monthly Summary</h2>
  <div class="summary-controls">
    <label for="month-selector">Month:</label>
    <select id="month-selector"></select>
  </div>
  <div id="summary-content">
    <p id="summary-total"></p>
    <ul id="summary-breakdown" aria-label="Category breakdown"></ul>
    <p id="summary-empty-msg" hidden>No transactions for this month.</p>
  </div>
</section>

<!-- Toggle button — placed after the chart section or in the header -->
<button id="summary-toggle" type="button" aria-expanded="false"
        aria-controls="summary-section">
  Show Monthly Summary
</button>
```

**JS functions:**
- `getMonthKey(createdAt) → "YYYY-MM"` — converts a `createdAt` timestamp to a month key using local-timezone `Date` methods (`.getFullYear()`, `.getMonth()`).
- `getMonthLabel(monthKey) → "MMMM YYYY"` — converts `"YYYY-MM"` to a human-readable label using `Date` + `toLocaleString('default', { month: 'long', year: 'numeric' })`.
- `groupTransactionsByMonth(txArray) → Map<string, Transaction[]>` — groups transactions into a `Map` keyed by `"YYYY-MM"`.
- `renderMonthSelector()` — populates `#month-selector` with one `<option>` per month (descending), auto-selects most recent, updates `currentSummaryMonth`.
- `renderMonthlySummary()` — reads `currentSummaryMonth`, filters transactions, computes total and per-category breakdown, updates `#summary-total`, `#summary-breakdown`, and toggles `#summary-empty-msg`.
- `handleMonthChange(event)` — updates `currentSummaryMonth`, calls `renderMonthlySummary()`.
- `handleSummaryToggle()` — toggles the `hidden` attribute on `#summary-section` and updates `aria-expanded` on the toggle button.

**Integration with existing refresh flow:** `updateBalance()`, `renderList()`, and `updateChart()` are already called after every add/delete. A new `refreshMonthlySummary()` wrapper will call `renderMonthSelector()` + `renderMonthlySummary()` and be appended to the same call sites.

---

## Data Models

### Existing: Transaction (unchanged)
```ts
interface Transaction {
  id:        string;   // crypto.randomUUID() or Date.now() fallback
  name:      string;   // 1–100 characters, trimmed
  amount:    number;   // 0.01 – 999,999,999.99
  category:  string;   // any value in getAllCategories()
  createdAt: number;   // Date.now() timestamp
}
```

### New: localStorage keys
| Key | Type | Description |
|-----|------|-------------|
| `expense_visualizer_transactions` | `Transaction[]` (JSON) | Existing — unchanged |
| `expense_visualizer_theme` | `"light" \| "dark"` (JSON string) | New — user theme preference |
| `expense_visualizer_categories` | `string[]` (JSON) | New — custom category names in creation order |

### Custom category color map (runtime only, not persisted)
At runtime, `CATEGORY_COLORS` is extended with colors from `CUSTOM_CATEGORY_PALETTE` by index:
```js
function getCategoryColor(cat) {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  const idx = customCategories.indexOf(cat);
  return idx >= 0 ? CUSTOM_CATEGORY_PALETTE[idx % CUSTOM_CATEGORY_PALETTE.length] : '#CCCCCC';
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme toggle is an involution

*For any* starting theme value (`"light"` or `"dark"`), toggling the theme twice must return `document.documentElement.dataset.theme` to the original value.

**Validates: Requirements 1.2**

---

### Property 2: Custom category validation rejects all invalid inputs

*For any* category name input and any current category list, the `validateCustomCategory` function must return a non-null error message when the input is empty/whitespace-only, exceeds 50 characters, is a case-insensitive duplicate of an existing name, or would cause the custom category count to exceed 20; and must return `null` for all inputs that satisfy all four conditions simultaneously.

**Validates: Requirements 2.2**

---

### Property 3: Custom category add round-trip

*For any* valid category name and any valid starting category list, after calling `handleAddCategory` the new name must appear in `customCategories` and as an `<option>` in `#category`, and the built-in categories must still appear first in their original order.

**Validates: Requirements 2.3, 2.12**

---

### Property 4: Custom category delete removes from list

*For any* `customCategories` list containing at least one entry, deleting any one entry must result in that entry being absent from `customCategories` and absent from the `#category` dropdown, while all other custom categories remain present, and the three built-in categories remain unchanged.

**Validates: Requirements 2.6, 2.9**

---

### Property 5: Deleting a custom category preserves existing transactions

*For any* transactions array that contains transactions referencing a custom category, deleting that custom category must leave the `transactions` array completely unchanged (same length, same entries).

**Validates: Requirements 2.8**

---

### Property 6: Custom category delete buttons have correct accessible names

*For any* list of custom category names rendered in `#custom-category-list`, every `<button>` in that list must have an `aria-label` attribute whose value equals `"Delete " + categoryName` for its corresponding category.

**Validates: Requirements 2.5**

---

### Property 7: Custom category colors are unique and distinct from built-in colors

*For any* set of custom categories (1 to 20 items), the color returned by `getCategoryColor` for each custom category must differ from every other custom category's color and from the three built-in colors (`#FF6384`, `#36A2EB`, `#FFCE56`).

**Validates: Requirements 2.11**

---

### Property 8: isValidCategory accepts built-in and custom categories

*For any* category string that is a member of `getAllCategories()` (built-in or custom), `isValidCategory` must return `true`; for any string that is not a member of `getAllCategories()`, it must return `false`.

**Validates: Requirements 4.7**

---

### Property 9: Month selector lists exactly the months with transactions

*For any* transactions array, `renderMonthSelector` must produce `<option>` elements whose values correspond exactly to the set of distinct `"YYYY-MM"` month keys derived from the `createdAt` fields of those transactions — no more, no fewer — in descending chronological order.

**Validates: Requirements 3.2, 3.7**

---

### Property 10: Monthly summary correctness (total and breakdown)

*For any* transactions array and any selected month key, `renderMonthlySummary` must display:
- a total that equals the sum of `amount` for all transactions whose `getMonthKey(createdAt)` equals the selected month key, and
- a per-category breakdown that includes exactly the categories with a positive total for that month (none with zero total), each showing the correct category-sum formatted as currency.

**Validates: Requirements 3.3, 3.4, 3.5**

---

### Property 11: `getMonthKey` uses local timezone

*For any* `createdAt` timestamp integer, `getMonthKey(createdAt)` must return `"YYYY-MM"` where `YYYY` equals `new Date(createdAt).getFullYear()` and `MM` (zero-padded) equals `new Date(createdAt).getMonth() + 1`, both evaluated in the local timezone.

**Validates: Requirements 3.9**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `THEME_KEY` read: absent or unrecognised value | Default to `"light"` silently |
| `THEME_KEY` write fails | Apply theme in-session; swallow error silently (non-critical) |
| `CATEGORIES_KEY` read: absent | Initialise with `[]`; no error shown |
| `CATEGORIES_KEY` read: malformed JSON or wrong type | Discard; initialise with `[]`; no error shown |
| `CATEGORIES_KEY` write fails | Keep in-memory state; show inline error in `#custom-category-error` (persistent) |
| `STORAGE_KEY` read: malformed | Existing behaviour — reset to `[]`, show banner notification |
| `STORAGE_KEY` write fails | Existing behaviour — persistent banner notification |
| Chart.js CDN fails to load | Existing behaviour — hide canvas, show text fallback |
| `customCategories` reaches 20 | Inline error message from `validateCustomCategory`; no addition |
| Deleting a custom category with linked transactions | Transactions retained; category removed from dropdown only |
| Monthly summary with no transactions | Show `#summary-empty-msg`; hide total and breakdown |
| `currentSummaryMonth` no longer exists after deletion | Auto-select most recent remaining month; if none, show empty state |

---

## Testing Strategy

### Unit tests (example-based)

Focus on concrete inputs and edge cases that complement the properties:

- `isValidName`, `isValidAmount`, `isValidCategory` with boundary values — including custom categories.
- `validateCustomCategory`: each failure mode individually (empty, too long, duplicate, over-limit).
- `loadTheme`: stored `"dark"`, stored `"light"`, absent key, unrecognised value.
- `loadCustomCategories`: valid array, absent key, malformed JSON, non-array JSON.
- `getMonthKey` / `getMonthLabel` with known timestamps and expected values.
- `formatCurrency` with representative amounts.
- `handleThemeToggle` — one example verifying the DOM attribute flip and localStorage write.
- `handleAddCategory` / `handleDeleteCategory` — one example each.
- Empty-state rendering for monthly summary.
- Regression tests for existing `handleFormSubmit` and `handleDeleteClick` with custom categories present.

### Property-based tests

Use **fast-check** (already available in the project via `node_modules` / listed in `devDependencies`). Each property test runs a minimum of **100 iterations**.

Each test is tagged with a comment in the format:
```
// Feature: expense-budget-enhancements, Property N: <property text>
```

| # | Property | Test description |
|---|---|---|
| 1 | Theme toggle is an involution | Generate a theme from `["light","dark"]`; toggle twice; assert original value |
| 2 | Validation rejects invalid inputs | Generate names from arbitrary(), whitespace-only strings, names >50 chars, duplicates (same/different case), lists at max capacity |
| 3 | Add round-trip preserves order | Generate valid name + valid list; add; assert name in list last, built-ins first |
| 4 | Delete removes from list | Generate list ≥ 1 items; pick random; delete; assert absent + rest intact + built-ins intact |
| 5 | Delete preserves transactions | Generate transactions with references to a custom category; delete category; assert transactions unchanged |
| 6 | Delete buttons accessible names | Generate category name list; render; assert each button `aria-label` = `"Delete " + name` |
| 7 | Custom colors unique and distinct | Generate 1–20 custom category names; call `getCategoryColor` for each; assert all different and none equal built-in colors |
| 8 | `isValidCategory` accepts all and only members | Generate categories from `getAllCategories()` (accept) and arbitrary strings not in list (reject) |
| 9 | Month selector completeness | Generate transactions with arbitrary `createdAt` values; render selector; assert option set = distinct month keys, descending order |
| 10 | Monthly summary correctness | Generate transactions across multiple months; pick a month; render summary; assert total = sum of amounts, breakdown = non-zero categories only |
| 11 | `getMonthKey` uses local timezone | Generate integer timestamps; assert `getMonthKey(ts)` matches `new Date(ts).getFullYear()` and `new Date(ts).getMonth() + 1` |

### Integration / regression

- Full add-transaction flow with a custom category: form submit → list renders → chart renders → localStorage updated.
- Delete transaction flow with custom category present.
- Page reload simulation: write known data to all three localStorage keys → re-run `init()` → assert all three features restore correctly.
- Monthly summary panel toggle (hidden/shown).

### What is NOT tested with PBT

- CSS layout and visual rendering (Theme 1.1, 1.6, 1.7, 4.3) — manual or accessibility-audit tooling.
- Execution ordering of side effects (2.4, 2.7) — example-based.
- `aria-expanded` / panel show-hide (3.1) — example-based DOM assertion.
