# Implementation Plan: Dark/Light Mode Toggle

## Overview

Add a theme switcher to the Expense & Budget Visualizer using a `data-theme` attribute on `<html>`, CSS custom properties for color variables, and a `Theme_Manager` module inside the existing `js/app.js` IIFE. The toggle button is added to the existing `<header>` in `index.html`. Theme preference is persisted in `localStorage` under `"expense_visualizer_theme"`. No new files, no new dependencies, no build step.

## Tasks

- [ ] 1. Add CSS custom properties and dark-theme overrides to `css/style.css`
  - [ ] 1.1 Declare `:root` CSS custom property block for light-theme color variables
    - Add the full `:root { --color-* }` variable block at the top of `css/style.css` (before any existing rules), defining all 16 variables listed in the design: `--color-bg-page`, `--color-bg-header`, `--color-bg-card`, `--color-text-primary`, `--color-text-secondary`, `--color-text-header`, `--color-accent`, `--color-border`, `--color-input-bg`, `--color-input-text`, `--color-input-border`, `--color-label`, `--color-heading`, `--color-error`, `--color-delete-border`, `--color-delete-text`, `--color-focus-ring`
    - Replace all hard-coded hex color values in existing selectors with the corresponding `var(--color-*)` references so the live stylesheet already uses variables
    - _Requirements: 2.5, 6.5_

  - [ ] 1.2 Declare `[data-theme="dark"]` override block in `css/style.css`
    - Add the `[data-theme="dark"] { --color-* }` block immediately after the `:root` block with the dark-theme values from the design
    - All 16 variables must be overridden; contrast ratios as documented in the design must be respected
    - _Requirements: 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 6.7_

  - [ ] 1.3 Add `#theme-toggle` button styles to `css/style.css`
    - Add the `#theme-toggle` ruleset with `min-width: 44px; min-height: 44px`, padding, font, border, border-radius, background, cursor, transition properties
    - Add hover (`#theme-toggle:hover`) and focus-visible (`#theme-toggle:focus-visible`) rules using `var(--color-focus-ring)`
    - _Requirements: 1.6, 1.7_

- [ ] 2. Add the toggle button to `index.html`
  - [ ] 2.1 Insert `<button id="theme-toggle">` into the `<header>` element
    - Place the button inside `<header>`, after the existing `#balance-display` div
    - Set `type="button"`, `id="theme-toggle"`, and initial `aria-label="Switch to dark mode"` (light theme is the default)
    - Set initial text content to `🌙 Dark Mode`
    - _Requirements: 1.1, 1.2, 1.4_

- [ ] 3. Implement `Theme_Manager` functions in `js/app.js`
  - [ ] 3.1 Add the `THEME_KEY` constant and `loadTheme()` function inside the IIFE
    - Declare `const THEME_KEY = 'expense_visualizer_theme'` alongside existing constants
    - Implement `loadTheme()`: reads `localStorage.getItem(THEME_KEY)`, returns `'light'` or `'dark'` if valid, falls back to `'light'` for any other value; wrap in `try/catch` to handle `localStorage` being unavailable
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 3.2 Write property test for `loadTheme()` — Property 2 & Property 3
    - **Property 2: Theme persistence round-trip** — for any valid theme value (`"light"` or `"dark"`), simulating `saveTheme` followed by `loadTheme` (using a mock storage object) returns the same value
    - **Property 3: Invalid stored value defaults to light** — for any string that is neither `"light"` nor `"dark"`, `simulateLoadTheme` returns `"light"`
    - Add `simulateLoadTheme(mockStorage)` helper at the top of `tests/app.test.js` (mirrors `loadTheme` logic but reads from a plain object instead of `localStorage`)
    - Run 200 iterations minimum; add to existing `tests/app.test.js`
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [ ] 3.3 Add `saveTheme()` function inside the IIFE
    - Implement `saveTheme(theme)`: calls `localStorage.setItem(THEME_KEY, theme)` inside a `try/catch` that silently swallows errors
    - _Requirements: 3.1, 3.5_

  - [ ] 3.4 Add `applyTheme()` and `updateToggleButton()` functions inside the IIFE
    - Implement `applyTheme(theme)`: calls `document.documentElement.setAttribute('data-theme', theme)` then calls `updateToggleButton(theme)`
    - Implement `updateToggleButton(currentTheme)`: reads `#theme-toggle` by id; if not found, returns early; sets `textContent` and `aria-label` based on whether `currentTheme` is `'dark'` or `'light'`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.3, 3.6, 6.7_

  - [ ] 3.5 Add `handleThemeToggle()` function inside the IIFE
    - Implement `handleThemeToggle()`: reads `document.documentElement.getAttribute('data-theme') || 'light'`, computes `next = current === 'dark' ? 'light' : 'dark'`, calls `applyTheme(next)` then `saveTheme(next)`
    - _Requirements: 2.1, 2.2, 3.1_

  - [ ]* 3.6 Write property test for `handleThemeToggle()` — Property 1
    - **Property 1: Toggle is an involution** — for any starting theme (`"light"` or `"dark"`), applying the toggle logic once produces the opposite theme, and applying it a second time returns to the original theme
    - Add pure-logic helper `simulateToggle(theme)` at the top of `tests/app.test.js` (mirrors `handleThemeToggle` toggle arithmetic without DOM access)
    - Run 200 iterations minimum; add to existing `tests/app.test.js`
    - **Validates: Requirements 2.1, 2.2**

- [ ] 4. Wire `Theme_Manager` into `init()` in `js/app.js`
  - [ ] 4.1 Call `applyTheme(loadTheme())` inside `init()` before the first paint
    - In the existing `init()` function, add `applyTheme(loadTheme())` immediately after `loadTransactions()` (and before any DOM-update calls) so the theme is applied synchronously on `DOMContentLoaded`
    - Add event listener wiring: `var toggleBtn = document.getElementById('theme-toggle'); if (toggleBtn) toggleBtn.addEventListener('click', handleThemeToggle);` at the end of the existing event-wiring block in `init()`
    - _Requirements: 3.2, 6.1, 6.2, 6.3, 6.6_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Run `npm test` (or `node --test tests/app.test.js`) and verify all existing tests plus the new theme property tests pass without errors. Ask the user if any questions arise.

- [ ] 6. Validate chart color invariance and write property test — Property 4
  - [ ] 6.1 Confirm `CATEGORY_COLORS` is not touched by any Theme_Manager function
    - Read through `js/app.js` and verify that `CATEGORY_COLORS` is a `const` never reassigned or mutated inside `loadTheme`, `saveTheme`, `applyTheme`, `updateToggleButton`, or `handleThemeToggle`
    - _Requirements: 5.3_

  - [ ]* 6.2 Write property test for chart color invariance — Property 4
    - **Property 4: Chart category colors are invariant across themes** — for any theme state (`"light"` or `"dark"`), calling `simulateApplyTheme(theme)` (which must not mutate `CATEGORY_COLORS`) leaves `CATEGORY_COLORS` equal to `{ Food: "#FF6384", Transport: "#36A2EB", Fun: "#FFCE56" }`
    - Add `const CATEGORY_COLORS` and `simulateApplyTheme(theme)` helpers at the top of `tests/app.test.js`; `simulateApplyTheme` is a no-op stub (the property tests that the toggle logic path never touches the constant)
    - Run 200 iterations minimum; add to existing `tests/app.test.js`
    - **Validates: Requirements 5.3**

- [ ] 7. Final checkpoint — Ensure all tests pass
  - Run `npm test` one final time. Verify zero test failures and no regressions in the original Property 1–7 test suite. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All implementation goes into the three existing files only (`index.html`, `css/style.css`, `js/app.js`) — no new files are created (Req 6.5, 6.6)
- The theming mechanism is exclusively `data-theme` on `<html>` (Req 3.6, 6.7); do not use a `<body>` class
- Property tests mirror the pure logic in `loadTheme` / `handleThemeToggle` using mock helpers at the top of `tests/app.test.js`, following the established pattern of the existing test file
- Checkpoints ensure all prior work is validated before moving on

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "3.1", "3.3"] },
    { "id": 2, "tasks": ["3.2", "3.4"] },
    { "id": 3, "tasks": ["3.5", "3.6"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2"] }
  ]
}
```
