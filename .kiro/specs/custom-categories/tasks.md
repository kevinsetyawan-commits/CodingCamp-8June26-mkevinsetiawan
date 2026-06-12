# Implementation Plan: Custom Categories

## Overview

Extend the existing vanilla JS/HTML/CSS Expense & Budget Visualizer with a Custom Categories feature. The implementation follows the existing unidirectional data-flow pattern in `app.js` (IIFE, no bundler) and introduces a new `Category_Manager` UI section, custom category CRUD with LocalStorage persistence, and full integration with the existing dropdown, chart, and transaction list.

All new logic lives in `app.js` and `css/style.css`; `index.html` receives new markup. Property-based tests are added to `tests/app.test.js` using fast-check and Node's built-in test runner.

---

## Tasks

- [ ] 1. Extend constants, state, and pure-logic helpers in `app.js`
  - [ ] 1.1 Add new constants and extend state variables
    - Inside the IIFE, add after the existing constants block:
      - `CATEGORY_STORAGE_KEY = 'expense_visualizer_custom_categories'`
      - `MAX_CUSTOM_CATEGORIES = 20`
      - `MAX_CATEGORY_NAME_LENGTH = 50`
      - `BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun']` (replaces bare `CATEGORIES` array references where needed)
      - `PALETTE` — 12-element hex color array (distinct from `#FF6384`, `#36A2EB`, `#FFCE56`)
    - Add mutable state: `let customCategories = [];`
    - Add session-scoped map: `const categoryColorMap = {};`
    - _Requirements: 2.1, 5.1, 6.3, 6.4, 7.1_

  - [ ] 1.2 Implement `getActiveCategories()` helper
    - Returns `BUILT_IN_CATEGORIES.concat(customCategories)` — always built-ins first
    - _Requirements: 2.1, 6.1, 7.1, 7.3_

  - [ ]* 1.3 Write property test for Property 3: Category list always starts with built-ins in fixed order
    - **Property 3: Category list always starts with built-ins in fixed order**
    - **Validates: Requirements 2.1, 6.1, 7.1, 7.3**
    - In `tests/app.test.js`: re-implement `getActiveCategories` inline; assert that for any array of custom categories the returned list always begins with `['Food', 'Transport', 'Fun']` in that exact order

  - [ ] 1.4 Implement `validateCategoryName(name, existingCategories, selfName = null)`
    - Returns `null` if valid; returns the exact error string from Requirement 8.1/8.2/8.3 otherwise
    - Empty/whitespace → `"Category name is required."`
    - > 50 chars → `"Category name must be 50 characters or fewer."`
    - Case-insensitive duplicate (excluding `selfName`) → `"A category with this name already exists."`
    - _Requirements: 1.2, 1.3, 1.4, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3_

  - [ ]* 1.5 Write property test for Property 1: Valid category names always pass validation
    - **Property 1: Valid category names always pass validation**
    - **Validates: Requirements 1.2, 3.3**
    - In `tests/app.test.js`: for any non-empty string of 1–50 chars that does not case-insensitively match any name in the active list, assert `validateCategoryName` returns `null`

  - [ ]* 1.6 Write property test for Property 2: Invalid category names are always rejected
    - **Property 2: Invalid category names are always rejected**
    - **Validates: Requirements 1.2, 1.3, 1.4, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3**
    - In `tests/app.test.js`: for empty/whitespace strings, strings > 50 chars, and strings matching an existing category (case-insensitively), assert `validateCategoryName` returns a non-null string

  - [ ] 1.7 Implement `assignColor(name)` helper
    - Assigns `PALETTE[usedCount % PALETTE.length]` to `categoryColorMap[name]` if not already assigned
    - _Requirements: 6.3, 6.4_

  - [ ]* 1.8 Write property test for Property 9: Category colors are unique per session
    - **Property 9: Category colors are unique per session**
    - **Validates: Requirements 6.3, 6.4**
    - In `tests/app.test.js`: re-implement `assignColor` inline; for any set of up to 12 unique category names, assert that all assigned colors are distinct

- [ ] 2. Implement Category Storage module in `app.js`
  - [ ] 2.1 Implement `loadCustomCategories()`
    - Follow the detailed logic in the design:
      1. Read `CATEGORY_STORAGE_KEY` from `localStorage`
      2. `null` → return `[]` (no error)
      3. Not parseable JSON → discard, show error notification, return `[]`
      4. Not an array → discard, show error notification, return `[]`
      5. Any element failing string/length validation → discard whole array, show error notification, return `[]`
      6. Silently remove any element that matches a `BUILT_IN_CATEGORIES` name case-insensitively
      7. Return sanitized array
    - Error message: `"Could not load saved custom categories. Your previous categories may be corrupted."`
    - _Requirements: 5.2, 5.3, 5.4, 8.5_

  - [ ]* 2.2 Write property test for Property 4: Custom category storage round-trip
    - **Property 4: Custom category storage round-trip**
    - **Validates: Requirements 5.1, 5.2**
    - In `tests/app.test.js`: re-implement `loadCustomCategories` inline (without DOM); for any valid string[] of 1–50 char names that do not conflict with built-ins, `JSON.stringify` → `loadCustomCategories` produces the same array

  - [ ]* 2.3 Write property test for Property 5: Malformed custom category storage produces empty custom list
    - **Property 5: Malformed custom category storage produces empty custom list**
    - **Validates: Requirements 5.4, 8.5**
    - In `tests/app.test.js`: for any value at `CATEGORY_STORAGE_KEY` that is malformed JSON, not an array, or contains invalid items, assert `loadCustomCategories` returns `[]`

  - [ ] 2.4 Implement `saveCustomCategories(updatedList)`
    - Accepts an array argument (does not rely on the module-level `customCategories` yet)
    - Writes `JSON.stringify(updatedList)` to `CATEGORY_STORAGE_KEY`
    - On success: clears any lingering save-error notification (mirrors `saveTransactions` pattern)
    - On failure: shows persistent error `"Warning: Your change could not be saved. It will be lost when you close this tab."`
    - Returns `true` on success, `false` on failure
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 8.4_

- [ ] 3. Checkpoint — Run all existing tests
  - Ensure all pre-existing tests in `tests/app.test.js` still pass with `node --test`.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Category_Manager HTML and CSS
  - [ ] 4.1 Add `#category-manager-section` markup to `index.html`
    - Insert the `<section id="category-manager-section">` block from the design inside `<main>`, after the chart section
    - Include: `#cm-name-input`, `#cm-add-btn`, `#cm-name-error` span, `#cm-category-list` `<ul>`
    - All controls must have correct `aria-label` / `aria-live` attributes
    - _Requirements: 1.1, 2.1, 2.2, 2.3_

  - [ ] 4.2 Add Category_Manager styles to `css/style.css`
    - Style `.cm-add-row`, `.cm-item`, `.cm-item--builtin`, `.cm-item--custom`, `.cm-item--editing`
    - Style `.cm-badge` ("Built-in" label), `.cm-rename-btn`, `.cm-delete-btn`, `.cm-rename-input`, `.cm-rename-confirm-btn`, `.cm-rename-cancel-btn`, `.cm-rename-error`
    - Ensure responsive layout: single-column stacking at 320 px viewport width
    - Ensure WCAG AA contrast ratios for all new elements
    - _Requirements: 2.2, 2.3_

- [ ] 5. Implement `renderCategoryManager()` and rename mode in `app.js`
  - [ ] 5.1 Implement `renderCategoryManager()`
    - Clears `#cm-category-list` and re-renders all categories
    - Built-in rows: `<li class="cm-item cm-item--builtin">` with name span + "Built-in" badge, no controls
    - Custom rows (normal state): `<li class="cm-item cm-item--custom">` with name span, rename button, delete button
    - Custom rows (editing state, when `currentlyEditingName` matches): render the editing HTML from the design (rename input, Save, Cancel, error span)
    - Disables `#cm-add-btn` and shows a limit note when `customCategories.length >= MAX_CUSTOM_CATEGORIES`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 7.2_

  - [ ] 5.2 Implement `enterRenameMode(name)` and `exitRenameMode()`
    - `enterRenameMode`: sets `currentlyEditingName = name`, calls `renderCategoryManager()`
    - `exitRenameMode`: clears `currentlyEditingName`, calls `renderCategoryManager()`
    - _Requirements: 3.2, 3.11_

- [ ] 6. Implement `updateDropdown()` in `app.js`
  - [ ] 6.1 Implement `updateDropdown()`
    - Rebuilds `#category` `<select>` options using `getActiveCategories()`
    - Preserves the currently selected value if it still exists in the active list
    - Always starts with `<option value="">-- Select --</option>`
    - _Requirements: 6.1, 6.2_

  - [ ] 6.2 Update `isValidCategory()` to accept the full active category list
    - Change `isValidCategory(cat)` to check against `getActiveCategories()` instead of the hardcoded `CATEGORIES` array
    - _Requirements: 7.4_

  - [ ]* 6.3 Write property test for Property 8: Transaction validator accepts exactly the active category set
    - **Property 8: Transaction validator accepts exactly the active category set**
    - **Validates: Requirements 7.4**
    - In `tests/app.test.js`: re-implement `isValidCategory` with dynamic list inline; assert returns `true` for every name in `getActiveCategories()` and `false` for strings not in the list

- [ ] 7. Extend `updateChart()` in `app.js`
  - [ ] 7.1 Refactor `updateChart()` to use `getActiveCategories()` and `categoryColorMap`
    - Replace hardcoded `CATEGORIES` loop with `getActiveCategories()`
    - Build `totals` object for all active categories (built-ins + custom)
    - Filter out zero-total categories before setting chart data
    - Map colors: built-ins use `CATEGORY_COLORS[cat]`; custom categories use `categoryColorMap[cat] || '#999999'`
    - _Requirements: 6.3, 6.5, 6.6_

- [ ] 8. Implement Category_Manager event handlers in `app.js`
  - [ ] 8.1 Implement `handleAddCategory()`
    - Read and trim `#cm-name-input` value
    - Clear `#cm-name-error` before validation (Req 8.7)
    - Validate with `validateCategoryName`; show inline error and return if invalid
    - Guard: if `customCategories.length >= MAX_CUSTOM_CATEGORIES`, return (button should already be disabled)
    - Call `saveCustomCategories([...customCategories, name])`; show inline error and return if save fails
    - Push `name` to `customCategories`, call `assignColor(name)`, clear input, call `renderCategoryManager()`, `updateDropdown()`, `updateChart()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.6, 8.7_

  - [ ] 8.2 Implement `handleDeleteCategory(name)`
    - Compute `updated = customCategories.filter(c => c !== name)`
    - Reassign affected transactions to `"Fun"` in a mapped copy
    - Call `saveCustomCategories(updated)` and `saveTransactions(updatedTxs)`; if either fails, show persistent error but still proceed with in-memory update (Req 4.7)
    - Update `customCategories`, `transactions`; call `renderCategoryManager()`, `updateDropdown()`, `renderList()`, `updateBalance()`, `updateChart()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 8.3 Write property test for Property 7: Deleted category causes reassignment to "Fun" and balance is preserved
    - **Property 7: Deleted category causes reassignment to "Fun" and balance is preserved**
    - **Validates: Requirements 4.3, 4.4, 4.6**
    - In `tests/app.test.js`: for any transaction array with some transactions assigned to a custom category name, simulate deletion reassignment logic inline; assert no transaction references the deleted name, all previously-assigned transactions have `category === 'Fun'`, and total balance is unchanged

  - [ ] 8.4 Implement `handleRenameConfirm(oldName, newName)`
    - Clear the rename row's error span before validation
    - Validate `newName.trim()` with `validateCategoryName(trimmed, getActiveCategories(), oldName)`; show inline rename error and return if invalid
    - Call `saveCustomCategories(updatedCats)` and `saveTransactions(updatedTxs)`; if either fails, show persistent error (optimistic-update: still apply in-memory changes per Req 3.10)
    - Update `customCategories`, `transactions`, transfer `categoryColorMap[oldName]` to `categoryColorMap[newName]`
    - Call `exitRenameMode()`, `renderCategoryManager()`, `updateDropdown()`, `renderList()`, `updateChart()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ]* 8.5 Write property test for Property 6: Renamed category is reflected in all transactions
    - **Property 6: Renamed category is reflected in all transactions**
    - **Validates: Requirements 3.6, 3.9**
    - In `tests/app.test.js`: for any transaction array with some entries having `category === oldName`, apply the rename map inline; assert every such transaction now has `category === newName` and no transaction references `oldName`

  - [ ] 8.6 Implement `handleRenameCancel()` handler
    - Calls `exitRenameMode()` without modifying any data
    - _Requirements: 3.11_

  - [ ] 8.7 Implement `handleCategoryListClick(event)` and `handleCategoryKeydown(event)` via event delegation on `#cm-category-list`
    - `handleCategoryListClick`: routes clicks on `.cm-rename-btn`, `.cm-delete-btn`, `.cm-rename-confirm-btn`, `.cm-rename-cancel-btn` to the appropriate handlers; reads `data-name` from the closest `.cm-item`
    - `handleCategoryKeydown`: on `Escape` key inside an editing row, calls `exitRenameMode()`
    - _Requirements: 3.1, 3.2, 3.11, 4.1_

- [ ] 9. Implement validation message reset behavior
  - [ ] 9.1 Ensure `#cm-name-error` is cleared at the start of every `handleAddCategory()` call (already handled in 8.1)
  - [ ]* 9.2 Write property test for Property 10: Validation messages are reset before each new submission attempt
    - **Property 10: Validation messages are reset before each new submission attempt**
    - **Validates: Requirements 8.7**
    - In `tests/app.test.js`: simulate two consecutive submission attempts with different inputs; assert that after the second attempt only the second attempt's error (or lack of error) is visible, with no stale errors from the first

- [ ] 10. Extend `init()` and wire everything together in `app.js`
  - [ ] 10.1 Extend `init()` to initialize custom categories and wire new event listeners
    - Call `customCategories = loadCustomCategories()` immediately after `loadTransactions()`
    - Call `customCategories.forEach(assignColor)` to assign session colors in stored order
    - Call `renderCategoryManager()` and `updateDropdown()` after `updateChart()`
    - Wire `#cm-add-btn` click → `handleAddCategory`
    - Wire `#cm-category-list` click → `handleCategoryListClick`
    - Wire `#cm-category-list` keydown → `handleCategoryKeydown`
    - _Requirements: 2.4, 5.2, 5.3, 6.1_

  - [ ] 10.2 Update `saveTransactions()` to accept an optional array argument
    - Allow callers (delete/rename handlers) to pass in an already-mutated array rather than relying on the module-level `transactions`
    - Maintain backward compatibility: if no argument supplied, use `transactions` as before
    - _Requirements: 3.9, 4.6_

- [ ] 11. Checkpoint — Run full test suite
  - Run `node --test` and confirm all tests (existing + new property tests) pass.
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests re-implement pure logic inline in `tests/app.test.js` (same pattern as existing tests) since `app.js` is an IIFE and not importable as a module
- Checkpoints at tasks 3 and 11 ensure incremental validation at stable integration points
- The optimistic-update rule (Req 3.10, 4.7) means rename/delete in-memory state is applied even when LocalStorage write fails; create (Req 1.7) does NOT use optimistic update

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.4", "1.7", "2.1", "2.4"] },
    { "id": 2, "tasks": ["1.3", "1.5", "1.6", "1.8", "2.2", "2.3", "4.1", "4.2"] },
    { "id": 3, "tasks": ["5.1", "5.2", "6.1", "6.2", "7.1"] },
    { "id": 4, "tasks": ["6.3", "8.1", "8.2", "8.4", "8.6", "8.7", "9.1", "10.2"] },
    { "id": 5, "tasks": ["8.3", "8.5", "9.2", "10.1"] }
  ]
}
```
