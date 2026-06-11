# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a client-side single-page web application using plain HTML, CSS, and Vanilla JavaScript. The app enables users to add, view, and delete expense transactions, persists data in LocalStorage, displays a running balance, and visualizes spending by category via a Chart.js pie chart loaded from the jsDelivr CDN. A fast-check property-based test suite validates the seven correctness properties defined in the design document.

---

## Tasks

- [x] 1. Scaffold project structure and static HTML shell
  - Create `index.html` with semantic markup: header containing `Balance_Display`, main section containing `Input_Form`, `Transaction_List`, and chart container
  - Add `<canvas id="spending-chart">` and `<p id="chart-empty-msg">` inside `<div id="chart-container">`
  - Load Chart.js v4.x from jsDelivr CDN **before** `js/app.js` in the `<script>` block
  - Add inline error notification placeholder `<div id="notification">` (hidden by default)
  - Include `<link rel="stylesheet" href="css/style.css">` and `<script src="js/app.js" defer></script>`
  - Create `css/style.css` as an empty file; create `js/app.js` as an empty file
  - _Requirements: 7.4, 7.5, 7.6_

- [x] 2. Implement constants, state, and data model
  - [x] 2.1 Define constants and state in `js/app.js`
    - Declare `STORAGE_KEY`, `CATEGORIES` array, validation limits (`MAX_AMOUNT`, `MIN_AMOUNT`, `MAX_NAME_LENGTH`), and fixed category colors
    - Declare module-level `let transactions = []` as the single source of truth
    - Declare `let chartInstance = null` for the Chart.js instance reference
    - Wrap everything in an IIFE to avoid polluting global scope
    - _Requirements: 7.1, 7.2_
- [x] 3. Implement Validator module
  - [x] 3.1 Implement pure validator functions in `js/app.js`
    - Write `isValidName(name)`: non-empty after trim, max 100 chars
    - Write `isValidAmount(amount)`: numeric, in range [0.01, 999,999,999.99]
    - Write `isValidCategory(cat)`: must be one of `['Food', 'Transport', 'Fun']`
    - Write `validateForm(name, amount, category)`: returns `{ name, amount, category }` with `null` or an error string per field
    - _Requirements: 1.3, 1.4_


- [x] 4. Implement Storage module
  - [x] 4.1 Implement `loadTransactions()` and `saveTransactions()` in `js/app.js`
    - `loadTransactions()`: reads `STORAGE_KEY` from `localStorage`, parses JSON, validates each item has all five required fields with correct types; on any failure discards data, initializes `transactions = []`, and calls `showNotification()` with the corrupted-data message; returns `Transaction[]`
    - `saveTransactions()`: serializes `transactions` via `JSON.stringify` and calls `localStorage.setItem`; on `try/catch` failure shows a persistent save-error notification without reverting in-memory state
    - Implement `showNotification(message, persistent)` helper that toggles the `#notification` element
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 3.6_



- [ ] 5. Checkpoint — storage and validation foundation
  - Ensure `validateForm`, `loadTransactions`, and `saveTransactions` are implemented and all property tests written so far pass. Ask the user if any questions arise before continuing.

- [x] 6. Implement Renderer module
  - [x] 6.1 Implement `formatCurrency(amount)` and `updateBalance()` in `js/app.js`
    - `formatCurrency(amount)`: returns `"$1,234.56"` using `toLocaleString` with `minimumFractionDigits: 2`
    - `updateBalance()`: sums `transactions` amounts and sets `#balance-value` text content
    - _Requirements: 4.1, 4.2, 4.5_



  - [x] 6.3 Implement `renderList()` in `js/app.js`
    - Clears `#transaction-list` and re-renders `<li>` items for each transaction in reverse insertion order (most recent first, using `createdAt`)
    - Each `<li>` has `data-id`, spans for name/category/amount, and a `<button class="delete-btn" aria-label="Delete {name}">×</button>`
    - When `transactions` is empty, inserts a single `<li class="empty-msg">No transactions yet</li>` instead
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 6.4 Implement `initChart()` and `updateChart()` in `js/app.js`
    - `initChart()`: guards against missing Chart.js (`typeof Chart === 'undefined'`), hides `<canvas>`, shows chart-unavailable error in `#chart-container`, then returns early; otherwise creates the Chart.js pie instance on `#spending-chart`
    - `updateChart()`: aggregates amounts per category, filters zero-total categories, shows `#chart-empty-msg` when no transactions exist, otherwise updates `chartInstance.data` and calls `chartInstance.update()`
    - Use fixed color constants: Food `#FF6384`, Transport `#36A2EB`, Fun `#FFCE56`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.6, 7.7_


- [x] 7. Implement Event Handlers and initialization
  - [x] 7.1 Implement `handleFormSubmit(event)` in `js/app.js`
    - Prevents default form submission
    - Reads `#item-name`, `#amount`, `#category` values
    - Calls `validateForm`; if errors, renders inline error `<span class="error-msg">` next to each invalid field and returns
    - On valid input: creates Transaction object with `crypto.randomUUID()` (fallback `Date.now().toString() + Math.random()`), unshifts into `transactions[]`, calls `saveTransactions()`, then calls `updateBalance()`, `renderList()`, `updateChart()`
    - Resets the form to default empty state
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 6.1_

  - [x] 7.2 Implement `handleDeleteClick(event)` with event delegation in `js/app.js`
    - Attaches one `'click'` listener to `#transaction-list`; returns early if target is not `.delete-btn`
    - Reads `data-id` from the parent `<li>`, filters `transactions[]` to remove the matching entry
    - Calls `saveTransactions()`, then `updateBalance()`, `renderList()`, `updateChart()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_



  - [x] 7.4 Implement `DOMContentLoaded` initialization block in `js/app.js`
    - Calls `loadTransactions()` to hydrate `transactions[]`
    - Calls `initChart()`, then `updateBalance()`, `renderList()`, `updateChart()`
    - Attaches `handleFormSubmit` to the `<form>` `'submit'` event
    - Attaches `handleDeleteClick` to `#transaction-list`
    - _Requirements: 2.4, 5.3, 6.3, 7.7_

- [ ] 8. Checkpoint — core functionality complete
  - Ensure all feature logic is wired end-to-end: add → save → render → delete → save → render. Run the full property test suite and confirm all 7 properties pass. Ask the user if any questions arise.

- [x] 9. Style the application with CSS
  - [x] 9.1 Implement responsive layout in `css/style.css`
    - Define base layout: sticky header with `Balance_Display`, two-column main area (form + list left, chart right) that collapses to single column at narrow viewports (≤ 600px)
    - Apply `overflow-y: auto` and a fixed `max-height` to `#transaction-list` to enable independent scroll without affecting surrounding layout
    - Ensure no horizontal scrollbar at viewport widths 320px–1920px
    - _Requirements: 2.2, 4.1, 8.4_

  - [x] 9.2 Implement typography, color, and accessibility styles in `css/style.css`
    - Set all body text `font-size` ≥ 14px
    - Choose foreground/background color pairs that achieve ≥ 4.5:1 contrast ratio (WCAG AA)
    - Style `.error-msg` in red with sufficient contrast; style `#notification` as a dismissible banner
    - Style `.delete-btn` with a visible focus ring and sufficient touch target size (≥ 44×44px)
    - _Requirements: 8.3, 7.3_

- [ ] 10. Final checkpoint — full integration and accessibility
  - Verify all property-based tests pass with `npx fast-check` or equivalent test runner
  - Confirm no uncaught JS errors in browser console across Chrome, Firefox, Edge, and Safari
  - Confirm Chart.js CDN failure gracefully shows error without breaking other features
  - Confirm malformed LocalStorage data shows error and empty state on reload
  - Ask the user if any questions arise before considering the feature complete.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** loaded via CDN or a minimal Node harness — no bundler required for the app itself
- Each property test task references its property number from the design document for traceability
- Checkpoints at Tasks 5, 8, and 10 ensure incremental validation before proceeding
- All rendering calls (`updateBalance`, `renderList`, `updateChart`) are always invoked together after any state mutation to keep UI consistent within the 100ms / 300ms / 500ms timing requirements
- `crypto.randomUUID()` fallback must be included for broader browser compatibility (Requirement 7.3)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.2", "4.3"] },
    { "id": 3, "tasks": ["6.1", "6.3", "6.4"] },
    { "id": 4, "tasks": ["6.2", "6.5"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.4"] },
    { "id": 6, "tasks": ["7.3"] },
    { "id": 7, "tasks": ["9.1", "9.2"] }
  ]
}
```
