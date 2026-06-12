# Implementation Plan: Expense & Budget Enhancements

## Overview

Incrementally extend the existing Expense & Budget Visualizer IIFE (`js/app.js`, `css/style.css`, `index.html`) with three features: Dark/Light Mode Toggle, Custom Categories, and Monthly Summary View. Each phase wires new state, storage, rendering, and event handlers into the existing architecture without introducing new files or libraries.

---

## Tasks

- [ ] 1. Refactor shared foundations — constants, state, helpers
  - [ ] 1.1 Rename `CATEGORIES` constant to `BUILTIN_CATEGORIES` and introduce `customCategories` state array and `getAllCategories()` helper
    - In `js/app.js`: rename the `const CATEGORIES` array to `BUILTIN_CATEGORIES`; add `let customCategories = [];` to the State section; add `function getAllCategories() { return BUILTIN_CATEGORIES.concat(customCategories); }`
    - Update `isValidCategory(cat)` to call `getAllCategories()` instead of `CATEGORIES`
    - Update `isValidTransactionShape` to accept categories from `getAllCategories()` (reads the runtime list, not the frozen built-ins only)
    - Update `validateForm` to use `getAllCategories()` when checking category validity
    - _Requirements: 2.3, 2.12, 4.7_

  - [ ] 1.2 Add `THEME_KEY`, `CATEGORIES_KEY` storage constants and `currentTheme` / `currentSummaryMonth` state variables
    - Add `const THEME_KEY = 'expense_visualizer_theme';` and `const CATEGORIES_KEY = 'expense_visualizer_categories';` in the Constants section
    - Add `let currentTheme = 'light';` and `let currentSummaryMonth = null;` in the State section
    - _Requirements: 1.4, 1.5, 2.4, 3.8_

  - [ ] 1.3 Add `CUSTOM_CATEGORY_PALETTE` constant and `getCategoryColor(cat)` helper
    - Add the 20-color palette array `CUSTOM_CATEGORY_PALETTE` (no color may equal `#FF6384`, `#36A2EB`, or `#FFCE56`)
    - Add `function getCategoryColor(cat)` that returns the built-in color from `CATEGORY_COLORS` if present, otherwise derives the color from `CUSTOM_CATEGORY_PALETTE` by the category's index in `customCategories`
    - _Requirements: 2.11, 4.8_

  - [ ]* 1.4 Write property test for `isValidCategory` accepting all and only members of `getAllCategories()` (Property 8)
    - **Property 8: `isValidCategory` accepts all and only `getAllCategories()` members**
    - **Validates: Requirements 4.7**
    - In `tests/app.test.js`: mirror `getAllCategories`, `BUILTIN_CATEGORIES`, `customCategories`, and the updated `isValidCategory`; generate strings from `getAllCategories()` (expect `true`) and arbitrary strings outside the list (expect `false`)

  - [ ]* 1.5 Write property test for `getCategoryColor` producing unique colors distinct from built-ins (Property 7)
    - **Property 7: Custom category colors are unique and distinct from built-in colors**
    - **Validates: Requirements 2.11**
    - Generate 1–20 unique category name strings; assert `getCategoryColor` returns a different value for each and none equals `#FF6384`, `#36A2EB`, or `#FFCE56`

---

- [ ] 2. Implement Dark/Light Mode Toggle
  - [ ] 2.1 Add CSS custom properties and `data-theme` token sets in `css/style.css`
    - Define `html[data-theme="light"]` and `html[data-theme="dark"]` blocks with CSS custom properties (`--bg`, `--surface`, `--text`, `--border`, `--header-bg`, `--header-text`, etc.)
    - Replace all hard-coded color values in `header`, `body`, `main > section`, form elements, buttons, `.delete-btn`, `#notification`, and the transaction list with `var(--…)` references
    - Ensure all `--text` on `--surface` combinations meet WCAG AA 4.5:1 contrast; minimum font-size remains 14px for all body text
    - _Requirements: 1.2, 1.6, 1.7, 4.1_

  - [ ] 2.2 Add Theme Toggle button markup in `index.html`
    - Inside `<header>`, after `#balance-display`, add: `<button id="theme-toggle" aria-label="Switch to dark mode" title="Toggle theme"><span id="theme-icon">🌙</span></button>`
    - Add minimal inline styles or a CSS class ensuring the button has a minimum touch target of 44×44 px and does not overlap other header elements at any viewport width 320–1920 px
    - _Requirements: 1.1, 1.3_

  - [ ] 2.3 Implement `loadTheme()`, `saveTheme(theme)`, and `applyTheme(theme)` in `js/app.js`
    - `loadTheme()`: reads `THEME_KEY` from `localStorage`; returns stored value if it is `"light"` or `"dark"`, otherwise returns `"light"`
    - `applyTheme(theme)`: sets `document.documentElement.dataset.theme = theme`; updates `#theme-toggle` `aria-label` and `#theme-icon` text to reflect current action/state; updates Chart.js plugin colors (legend text color, tooltip background) to match theme
    - `saveTheme(theme)`: writes to `THEME_KEY`; swallows all errors silently (non-critical per Req 4.6)
    - _Requirements: 1.2, 1.4, 1.5_

  - [ ] 2.4 Implement `handleThemeToggle()` and wire it to the button in `init()`
    - `handleThemeToggle()`: reads `currentTheme`, flips it, updates `currentTheme`, calls `saveTheme`, `applyTheme`, and `updateChart()` — all within one synchronous call so the transition completes in < 100 ms
    - In `init()`: read and apply the stored theme with `loadTheme()` + `applyTheme()`; attach `handleThemeToggle` to `#theme-toggle` click event
    - _Requirements: 1.2, 1.4, 1.5_

  - [ ]* 2.5 Write property test for theme toggle involution (Property 1)
    - **Property 1: Theme toggle is an involution**
    - **Validates: Requirements 1.2**
    - Generate a starting theme from `["light", "dark"]`; simulate toggling twice by calling the toggle logic; assert `document.documentElement.dataset.theme` (or the returned value) equals the original theme

---

- [ ] 3. Implement Custom Categories
  - [ ] 3.1 Add Category Manager markup in `index.html`
    - Inside `#form-section`, after the `<form>`, add the `#category-manager` `<div>` containing: heading, `#custom-category-input` text input (`maxlength="50"`), `#add-category-btn` button, `<span class="error-msg" id="custom-category-error" aria-live="polite">`, and `#custom-category-list` `<ul>`
    - _Requirements: 2.1_

  - [ ] 3.2 Implement `loadCustomCategories()`, `saveCustomCategories()`, and `validateCustomCategory(name, currentList)` in `js/app.js`
    - `loadCustomCategories()`: reads `CATEGORIES_KEY` from `localStorage`; parses JSON; accepts only a non-null string-element array; silently falls back to `[]` on any parse error or wrong type (Req 4.4)
    - `saveCustomCategories()`: writes `customCategories` to `CATEGORIES_KEY`; on failure shows a persistent inline error in `#custom-category-error` without reverting in-memory state (Req 4.5)
    - `validateCustomCategory(name, currentList)`: returns `null` on success; returns an error string if name is empty after trim, exceeds 50 chars, is a case-insensitive duplicate of any name in `currentList`, or would push the count beyond 20 (Req 2.2)
    - _Requirements: 2.2, 2.4, 2.7, 4.4, 4.5_

  - [ ]* 3.3 Write property test for `validateCustomCategory` rejecting all invalid inputs (Property 2)
    - **Property 2: Custom category validation rejects all invalid inputs**
    - **Validates: Requirements 2.2**
    - Generate: whitespace-only strings, strings > 50 chars, case-insensitive duplicates, and lists already at 20 items — assert non-null returned; generate names passing all four conditions simultaneously — assert null returned

  - [ ] 3.4 Implement `updateCategoryDropdown()` and `renderCategoryManager()` in `js/app.js`
    - `updateCategoryDropdown()`: clears `<select id="category">` and repopulates with a placeholder option, then built-ins in original order, then `customCategories` in creation order
    - `renderCategoryManager()`: clears `#custom-category-list` and re-renders one `<li>` per custom category, each with a delete `<button aria-label="Delete {name}">` (Req 2.5)
    - Both functions must be idempotent (safe to call multiple times)
    - _Requirements: 2.3, 2.5, 2.6, 2.12_

  - [ ]* 3.5 Write property test for delete button accessible names (Property 6)
    - **Property 6: Custom category delete buttons have correct accessible names**
    - **Validates: Requirements 2.5**
    - Generate a list of category name strings; call `renderCategoryManager()` against a DOM stub; assert every `<button>` in `#custom-category-list` has `aria-label === "Delete " + categoryName`

  - [ ] 3.6 Implement `handleAddCategory()` in `js/app.js`
    - Read `#custom-category-input` value; call `validateCustomCategory`; on failure show error in `#custom-category-error` and return; on success push to `customCategories`, call `saveCustomCategories()`, `renderCategoryManager()`, `updateCategoryDropdown()`, and clear the input field — all without a page reload
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 3.7 Write property test for custom category add round-trip (Property 3)
    - **Property 3: Custom category add round-trip**
    - **Validates: Requirements 2.3, 2.12**
    - Generate a valid name and a valid starting list; simulate `handleAddCategory`; assert the new name appears in `customCategories` last, built-in categories remain first in original order, and `#category` dropdown option order matches

  - [ ] 3.8 Implement `handleDeleteCategory(name)` in `js/app.js`
    - Remove `name` from `customCategories`; call `saveCustomCategories()` before updating the UI; call `renderCategoryManager()` + `updateCategoryDropdown()`; leave `transactions` array untouched
    - Ensure built-in categories (Food, Transport, Fun) cannot be deleted (guard check) (Req 2.9)
    - _Requirements: 2.6, 2.7, 2.8, 2.9_

  - [ ]* 3.9 Write property test for custom category delete removes from list (Property 4)
    - **Property 4: Custom category delete removes from list**
    - **Validates: Requirements 2.6, 2.9**
    - Generate a list with ≥ 1 entry; pick a random entry; call `handleDeleteCategory`; assert that entry is absent from `customCategories` and the dropdown, all other custom categories remain, and built-ins are unchanged

  - [ ]* 3.10 Write property test for delete preserving existing transactions (Property 5)
    - **Property 5: Deleting a custom category preserves existing transactions**
    - **Validates: Requirements 2.8**
    - Generate a transactions array containing entries referencing a custom category; delete that category; assert `transactions` array is identical (same length, same entries) to the pre-deletion state

  - [ ] 3.11 Update `updateChart()` to include custom category slices with consistent colors
    - Change aggregation loop from iterating only `BUILTIN_CATEGORIES` to iterating `getAllCategories()`
    - Use `getCategoryColor(cat)` for all `backgroundColor` lookups (built-in and custom)
    - Include only non-zero-total categories as active slices
    - _Requirements: 2.11, 4.8_

  - [ ] 3.12 Wire Custom Category event handlers in `init()`
    - Attach `handleAddCategory` to `#add-category-btn` click
    - Attach a delegated click handler on `#custom-category-list` that calls `handleDeleteCategory(name)` when a delete button is clicked
    - Call `loadCustomCategories()`, `renderCategoryManager()`, and `updateCategoryDropdown()` during initialization, before attaching form handlers
    - _Requirements: 2.6, 2.10_

---

- [ ] 4. Checkpoint — Verify Dark/Light Mode and Custom Categories
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm theme toggle applies correctly in both directions, persists on reload, and has no console errors
  - Confirm custom categories add/delete without page reload, persist across reloads, and appear in the chart with distinct colors

---

- [ ] 5. Implement Monthly Summary View
  - [ ] 5.1 Add Monthly Summary section and toggle button markup in `index.html`
    - Add a `<section id="summary-section" aria-labelledby="summary-heading" hidden>` after the chart section in `<main>`, containing: `<h2 id="summary-heading">Monthly Summary</h2>`, `.summary-controls` div with `<label>` + `<select id="month-selector">`, `<div id="summary-content">` with `<p id="summary-total">`, `<ul id="summary-breakdown">`, and `<p id="summary-empty-msg" hidden>`
    - Add `<button id="summary-toggle" type="button" aria-expanded="false" aria-controls="summary-section">Show Monthly Summary</button>` in a logical position (e.g., inside `<main>` above or below the chart section)
    - _Requirements: 3.1_

  - [ ] 5.2 Add Monthly Summary CSS in `css/style.css`
    - Style `#summary-section` as a full-width card (spanning both grid columns on desktop) using `grid-column: 1 / -1`
    - Style `.summary-controls`, `#summary-breakdown`, `#summary-total`, and `#summary-empty-msg` to be readable and responsive from 320–1920 px; all colors use CSS custom property variables so they theme correctly
    - _Requirements: 3.1, 4.3_

  - [ ] 5.3 Implement `getMonthKey(createdAt)` and `getMonthLabel(monthKey)` in `js/app.js`
    - `getMonthKey(createdAt)`: returns `"YYYY-MM"` using `new Date(createdAt).getFullYear()` and `new Date(createdAt).getMonth() + 1`, zero-padded, local timezone
    - `getMonthLabel(monthKey)`: converts `"YYYY-MM"` string to a `"MMMM YYYY"` human-readable label using `new Date(year, month-1).toLocaleString('default', { month: 'long', year: 'numeric' })`
    - _Requirements: 3.2, 3.9_

  - [ ]* 5.4 Write property test for `getMonthKey` using local timezone (Property 11)
    - **Property 11: `getMonthKey` uses local timezone**
    - **Validates: Requirements 3.9**
    - Generate integer timestamps (positive integers up to `Number.MAX_SAFE_INTEGER`); assert `getMonthKey(ts)` returns `"YYYY-MM"` where `YYYY === new Date(ts).getFullYear()` and `MM` (zero-padded) equals `new Date(ts).getMonth() + 1`

  - [ ] 5.5 Implement `groupTransactionsByMonth(txArray)`, `renderMonthSelector()`, and `renderMonthlySummary()` in `js/app.js`
    - `groupTransactionsByMonth(txArray)`: returns a `Map<string, Transaction[]>` keyed by `"YYYY-MM"` month keys
    - `renderMonthSelector()`: populates `#month-selector` with one `<option>` per distinct month (descending chronological order); auto-selects the most recent month and sets `currentSummaryMonth`; if no transactions exist, clears the selector
    - `renderMonthlySummary()`: reads `currentSummaryMonth`; if null or no transactions for that month renders `#summary-empty-msg` and hides `#summary-total` and `#summary-breakdown`; otherwise computes total and per-category breakdown (omitting zero-total categories), formats total with `formatCurrency`, and updates the DOM
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9_

  - [ ]* 5.6 Write property test for month selector completeness (Property 9)
    - **Property 9: Month selector lists exactly the months with transactions**
    - **Validates: Requirements 3.2, 3.7**
    - Generate a transactions array with arbitrary `createdAt` values; call `renderMonthSelector()`; assert the set of `<option value>` strings equals exactly the set of distinct `getMonthKey` values from the transactions, in descending order

  - [ ]* 5.7 Write property test for monthly summary correctness (Property 10)
    - **Property 10: Monthly summary correctness (total and breakdown)**
    - **Validates: Requirements 3.3, 3.4, 3.5**
    - Generate a transactions array and pick a month key that exists; call `renderMonthlySummary()`; assert `#summary-total` text equals `formatCurrency(sum of amounts for that month)` and `#summary-breakdown` contains exactly the non-zero-total categories with correct formatted amounts

  - [ ] 5.8 Implement `handleMonthChange(event)` and `handleSummaryToggle()` in `js/app.js`
    - `handleMonthChange(event)`: updates `currentSummaryMonth = event.target.value`; calls `renderMonthlySummary()` within 100 ms (synchronous)
    - `handleSummaryToggle()`: toggles `hidden` attribute on `#summary-section`; updates `aria-expanded` on `#summary-toggle`; updates button text between "Show Monthly Summary" and "Hide Monthly Summary"
    - _Requirements: 3.1, 3.3_

  - [ ] 5.9 Integrate `refreshMonthlySummary()` into the add/delete refresh flow in `js/app.js`
    - Add a `refreshMonthlySummary()` wrapper that calls `renderMonthSelector()` then `renderMonthlySummary()`
    - Append `refreshMonthlySummary()` to `handleFormSubmit` and `handleDeleteClick` after the existing `updateBalance()`, `renderList()`, `updateChart()` calls
    - Handle the case where the currently selected month is removed after a deletion (auto-select most recent remaining, or show empty state) per Req 3.7
    - _Requirements: 3.7_

  - [ ] 5.10 Wire Monthly Summary handlers in `init()`
    - Attach `handleSummaryToggle` to `#summary-toggle` click
    - Attach `handleMonthChange` to `#month-selector` change
    - Call `refreshMonthlySummary()` during initialization so the selector and summary are populated on load
    - _Requirements: 3.1, 3.8_

---

- [ ] 6. Regression and integration hardening
  - [ ] 6.1 Update `isValidTransactionShape` to accept custom categories on load
    - Change the category check to use `getAllCategories()` so transactions with custom category values are not discarded during `loadTransactions()` (Req 4.7)
    - Ensure `loadCustomCategories()` is called before `loadTransactions()` in `init()` so `customCategories` is populated when `isValidTransactionShape` runs
    - _Requirements: 4.7_

  - [ ] 6.2 Update existing unit tests in `tests/app.test.js` to mirror refactored logic
    - Mirror `BUILTIN_CATEGORIES`, `getAllCategories()`, `customCategories`, and the updated `isValidCategory` and `isValidTransactionShape` implementations in the test file
    - Add example-based tests for: `loadTheme` (stored `"dark"`, `"light"`, absent, unrecognised), `loadCustomCategories` (valid array, absent key, malformed JSON, non-array), `getMonthLabel` with known input/output pairs
    - Add a regression test for `handleFormSubmit` and `handleDeleteClick` with custom categories present in the list
    - _Requirements: 4.2_

  - [ ]* 6.3 Write integration test: page reload simulation for all three localStorage keys
    - Write to all three keys (`STORAGE_KEY`, `THEME_KEY`, `CATEGORIES_KEY`) with known valid data in `tests/app.test.js`; re-run the load functions; assert all three features restore correctly (transactions, theme, custom categories)
    - _Requirements: 1.5, 2.10, 3.8, 4.2_

---

- [ ] 7. Final checkpoint — Ensure all tests pass
  - Run `npm test` and confirm all property and unit tests pass with zero failures.
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- `loadCustomCategories()` MUST be called before `loadTransactions()` in `init()` so custom category names are available when validating loaded transactions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "1.5", "2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "3.2"] },
    { "id": 3, "tasks": ["2.4", "2.5", "3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "3.6", "3.11"] },
    { "id": 5, "tasks": ["3.7", "3.8"] },
    { "id": 6, "tasks": ["3.9", "3.10", "3.12", "5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3", "6.1"] },
    { "id": 8, "tasks": ["5.4", "5.5", "6.2"] },
    { "id": 9, "tasks": ["5.6", "5.7", "5.8"] },
    { "id": 10, "tasks": ["5.9"] },
    { "id": 11, "tasks": ["5.10", "6.3"] }
  ]
}
```
