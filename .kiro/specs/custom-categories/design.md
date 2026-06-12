# Design Document: Custom Categories

## Overview

The Custom Categories feature extends the existing Expense & Budget Visualizer by allowing users to create, rename, and delete their own spending categories beyond the three built-in ones (Food, Transport, Fun). The feature operates entirely client-side with no backend, persisting custom category data in LocalStorage under a dedicated key (`expense_visualizer_custom_categories`) separate from the transaction storage key.

The feature integrates seamlessly into the existing unidirectional data flow: category mutations update in-memory state → persist to LocalStorage → re-render all affected UI components (Category_Manager list, Input_Form dropdown, Chart). Built-in categories are immutable and always available, guaranteeing backward compatibility with existing transaction data.

### Key Design Decisions

- **Separate storage keys** — Custom categories are stored under a dedicated key rather than embedded in each transaction. This keeps the Transaction schema unchanged and allows the category list to evolve independently.
- **Session-scoped color assignment** — Chart colors for custom categories are assigned at creation time and held in memory for the session. Colors are not persisted; on reload, they are reassigned deterministically from the palette in the order categories are loaded.
- **Write-before-render discipline** — Every mutating operation writes to LocalStorage before updating the UI. If the write fails, the in-memory state and UI are not updated (except for rename/delete which follow an optimistic-update pattern per Requirement 3.10 / 4.7).
- **Case-insensitive uniqueness** — Category name uniqueness is enforced case-insensitively at the validator level to prevent confusing duplicates like "food" vs "Food".

---

## Architecture

The feature extends the existing single-file architecture in `app.js` with new logical sections, following the same unidirectional data flow:

```
User Action (Category_Manager form / rename / delete)
    │
    ▼
Category Validator (validateCategoryName, isDuplicateName)
    │
    ▼
State Mutation (customCategories[] array, transactions[] update on rename/delete)
    │
    ├──► Category Storage (LocalStorage read/write under CATEGORY_STORAGE_KEY)
    │    └── also writes Transaction storage on rename / delete
    │
    └──► Renderer
         ├── renderCategoryManager()  — Category_Manager list
         ├── updateDropdown()         — Input_Form <select>
         └── updateChart()            — Chart.js pie chart (extended)
```

### Extended File Structure

```
/
├── index.html     ← Add #category-manager section and controls
├── css/
│   └── style.css  ← Add Category_Manager styles
└── js/
    └── app.js     ← Extend with new sections (see Module Boundaries below)
```

### Extended Module Boundaries (within app.js)

| Section | Responsibility |
|---|---|
| Constants (extended) | Add `CATEGORY_STORAGE_KEY`, `MAX_CATEGORY_NAME_LENGTH`, `PALETTE` (12-color array), `MAX_CUSTOM_CATEGORIES` |
| State (extended) | Add `customCategories` array (Custom_Category names in creation order) and `categoryColorMap` object (name → hex color) |
| Category Validator | `validateCategoryName(name, existingCategories, selfName?)` — returns null or error string |
| Category Storage | `loadCustomCategories()`, `saveCustomCategories()` |
| Category Manager Renderer | `renderCategoryManager()`, `enterRenameMode(name)`, `exitRenameMode()` |
| Dropdown Updater | `updateDropdown()` — rebuilds `<select>` options from full active category list |
| Category Event Handlers | `handleAddCategory()`, `handleRenameConfirm()`, `handleRenameCancel()`, `handleDeleteCategory()` |
| Chart (extended) | `updateChart()` extended to handle dynamic category list and color map |

---

## Components and Interfaces

### 1. Category_Manager (new section)

**HTML additions to `index.html`:**

```html
<section id="category-manager-section" aria-labelledby="cm-heading">
  <h2 id="cm-heading">Manage Categories</h2>

  <!-- Add new category -->
  <div id="cm-add-row" class="cm-add-row">
    <input
      type="text"
      id="cm-name-input"
      maxlength="50"
      placeholder="New category name"
      autocomplete="off"
      aria-label="New category name"
    >
    <button id="cm-add-btn" type="button">Add</button>
    <span class="error-msg" id="cm-name-error" aria-live="polite"></span>
  </div>

  <!-- Category list -->
  <ul id="cm-category-list" aria-label="Category list">
    <!-- Rendered by renderCategoryManager() -->
  </ul>
</section>
```

Each list item rendered by `renderCategoryManager()`:

```html
<!-- Built-in category row (no controls) -->
<li class="cm-item cm-item--builtin" data-name="Food">
  <span class="cm-item-name">Food</span>
  <span class="cm-badge">Built-in</span>
</li>

<!-- Custom category row (with controls) -->
<li class="cm-item cm-item--custom" data-name="Health">
  <span class="cm-item-name">Health</span>
  <button class="cm-rename-btn" aria-label="Rename Health">Rename</button>
  <button class="cm-delete-btn" aria-label="Delete Health">Delete</button>
</li>

<!-- Custom category row in editable (rename) state -->
<li class="cm-item cm-item--custom cm-item--editing" data-name="Health">
  <input type="text" class="cm-rename-input" value="Health" maxlength="50"
         aria-label="Rename Health">
  <button class="cm-rename-confirm-btn">Save</button>
  <button class="cm-rename-cancel-btn">Cancel</button>
  <span class="error-msg cm-rename-error" aria-live="polite"></span>
</li>
```

### 2. Extended State

```js
// Custom category names in creation order (source of truth for custom cats)
let customCategories = [];  // string[]

// Maps category name → hex color string (session-scoped; rebuilt on load)
const categoryColorMap = {};  // { [name: string]: string }

// Returns the full active category list: built-ins first, then customs
function getActiveCategories() {
  return BUILT_IN_CATEGORIES.concat(customCategories);
}
```

### 3. Category Validator

```js
/**
 * Validates a proposed Category_Name.
 * @param {string} name - The trimmed candidate name
 * @param {string[]} existingCategories - All current active category names
 * @param {string|null} selfName - When renaming, the category's current name (excluded from dup check)
 * @returns {string|null} null if valid, or a user-facing error string
 */
function validateCategoryName(name, existingCategories, selfName = null) {
  if (!name || name.trim().length === 0) {
    return 'Category name is required.';
  }
  if (name.trim().length > MAX_CATEGORY_NAME_LENGTH) {
    return 'Category name must be 50 characters or fewer.';
  }
  const lower = name.trim().toLowerCase();
  const isDup = existingCategories.some(
    cat => cat.toLowerCase() === lower && cat !== selfName
  );
  if (isDup) {
    return 'A category with this name already exists.';
  }
  return null;
}
```

### 4. Category Storage Module

```js
const CATEGORY_STORAGE_KEY = 'expense_visualizer_custom_categories';
const BUILT_IN_CATEGORIES  = ['Food', 'Transport', 'Fun'];
const MAX_CUSTOM_CATEGORIES = 20;
const MAX_CATEGORY_NAME_LENGTH = 50;

/**
 * Reads custom categories from LocalStorage. Returns string[] or [].
 * Deduplicates names that conflict case-insensitively with built-ins.
 * On malformed data: resets to [], shows error notification.
 */
function loadCustomCategories() { ... }

/**
 * Serializes customCategories[] to JSON and writes under CATEGORY_STORAGE_KEY.
 * On failure: shows persistent error notification.
 * @returns {boolean} true on success, false on failure
 */
function saveCustomCategories() { ... }
```

**`loadCustomCategories()` detailed logic:**

```
1. raw = localStorage.getItem(CATEGORY_STORAGE_KEY)
2. if raw === null → return []  (clean first-time state, no error)
3. parsed = JSON.parse(raw)     → if throws, discard + show error + return []
4. if !Array.isArray(parsed)    → discard + show error + return []
5. validate each item:
   - typeof item === 'string'
   - item.trim().length >= 1 and <= 50
   if any item fails → discard entire array + show error + return []
6. deduplicate: filter out any name that matches a BUILT_IN_CATEGORIES name
   case-insensitively (silent deduplication — no error shown)
7. return deduplicated array
```

### 5. Color Palette and Assignment

```js
// 12-slot fixed palette (distinct from built-in colors #FF6384, #36A2EB, #FFCE56)
const PALETTE = [
  '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF',
  '#E7E9ED', '#71B37C', '#95616B', '#E8C3B9',
  '#C45850', '#3E95CD', '#8E5EA2', '#3CBA9F',
];

/**
 * Assigns a color from PALETTE to a category name if not already assigned.
 * Colors are assigned in palette order; if all 12 slots are used, cycles back.
 * Called at creation time and at load time (in stored order).
 * @param {string} name
 */
function assignColor(name) {
  if (!categoryColorMap[name]) {
    const usedCount = Object.keys(categoryColorMap).length;
    categoryColorMap[name] = PALETTE[usedCount % PALETTE.length];
  }
}
```

### 6. Input_Form Dropdown Updater

```js
/**
 * Rebuilds the #category <select> options to match the current active category list.
 * Always called after any custom category mutation.
 */
function updateDropdown() {
  const select = document.getElementById('category');
  if (!select) return;

  // Preserve current selection if still valid
  const current = select.value;
  const active  = getActiveCategories();

  select.innerHTML = '<option value="">-- Select --</option>';
  active.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === current) opt.selected = true;
    select.appendChild(opt);
  });
}
```

### 7. Extended Chart Module

`updateChart()` is extended to use `getActiveCategories()` and `categoryColorMap` instead of the hardcoded `CATEGORIES` and `CATEGORY_COLORS`:

```js
function updateChart() {
  // Aggregate totals using getActiveCategories()
  const active = getActiveCategories();
  const totals = {};
  active.forEach(cat => { totals[cat] = 0; });
  transactions.forEach(tx => {
    if (totals.hasOwnProperty(tx.category)) totals[tx.category] += tx.amount;
  });

  // Filter out zero-total categories
  const activeWithData = active.filter(cat => totals[cat] > 0);

  chartInstance.data.labels = activeWithData.slice();
  chartInstance.data.datasets[0].data = activeWithData.map(cat => totals[cat]);
  chartInstance.data.datasets[0].backgroundColor = activeWithData.map(cat => {
    return CATEGORY_COLORS[cat] || categoryColorMap[cat] || '#999999';
  });
  chartInstance.update();
}
```

### 8. Event Handlers

```js
// Add category
function handleAddCategory() {
  const input = document.getElementById('cm-name-input');
  const name  = input ? input.value.trim() : '';
  const error = validateCategoryName(name, getActiveCategories());
  if (error) { showCategoryError(error); return; }
  if (customCategories.length >= MAX_CUSTOM_CATEGORIES) return;

  const saved = saveCustomCategories([...customCategories, name]);
  if (!saved) { showCategoryError('Warning: Your change could not be saved...'); return; }

  customCategories.push(name);
  assignColor(name);
  input.value = '';
  clearCategoryError();
  renderCategoryManager();
  updateDropdown();
  updateChart();
}

// Delete category
function handleDeleteCategory(name) {
  const updated = customCategories.filter(c => c !== name);
  // Reassign matching transactions to 'Fun'
  const updatedTxs = transactions.map(tx =>
    tx.category === name ? { ...tx, category: 'Fun' } : tx
  );

  const savedCats = saveCustomCategories(updated);
  const savedTxs  = saveTransactions(updatedTxs);  // extend saveTransactions to accept optional arg
  if (!savedCats || !savedTxs) { showPersistentError('...'); return; }

  customCategories = updated;
  transactions = updatedTxs;
  renderCategoryManager();
  updateDropdown();
  renderList();
  updateBalance();
  updateChart();
}

// Rename — confirm
function handleRenameConfirm(oldName, newName) {
  const trimmed = newName.trim();
  const error = validateCategoryName(trimmed, getActiveCategories(), oldName);
  if (error) { showRenameError(error); return; }

  const updatedCats = customCategories.map(c => c === oldName ? trimmed : c);
  const updatedTxs  = transactions.map(tx =>
    tx.category === oldName ? { ...tx, category: trimmed } : tx
  );

  // Write both storage entries before updating in-memory state
  const savedCats = saveCustomCategories(updatedCats);
  const savedTxs  = saveTransactions(updatedTxs);
  if (!savedCats || !savedTxs) {
    showPersistentError('Warning: Your change could not be saved. It will be lost when you close this tab.');
  }

  // Per Req 3.10: update in-memory state even if write failed (optimistic update)
  customCategories = updatedCats;
  transactions = updatedTxs;
  if (categoryColorMap[oldName]) {
    categoryColorMap[trimmed] = categoryColorMap[oldName];
    delete categoryColorMap[oldName];
  }
  exitRenameMode();
  renderCategoryManager();
  updateDropdown();
  renderList();
  updateChart();
}
```

### 9. Initialization Extension

`init()` is extended to:

```js
function init() {
  loadTransactions();
  customCategories = loadCustomCategories();  // NEW
  customCategories.forEach(assignColor);       // NEW — assign colors in stored order
  initChart();
  updateBalance();
  renderList();
  updateChart();
  renderCategoryManager();  // NEW
  updateDropdown();          // NEW — rebuild dropdown with all categories

  // Existing event wiring...
  // NEW: wire Category_Manager events
  const addBtn = document.getElementById('cm-add-btn');
  if (addBtn) addBtn.addEventListener('click', handleAddCategory);

  const cmList = document.getElementById('cm-category-list');
  if (cmList) {
    cmList.addEventListener('click', handleCategoryListClick);
    cmList.addEventListener('keydown', handleCategoryKeydown); // Escape support
  }
}
```

---

## Data Models

### Custom Category Storage

| Field | Type | Constraints |
|---|---|---|
| name | string | 1–50 characters after trimming; unique case-insensitively across all categories |

**LocalStorage Schema:**

```
Key:   "expense_visualizer_custom_categories"
Value: JSON.stringify(string[])   // array of category name strings
```

Example:
```json
["Health", "Rent", "Entertainment", "Subscriptions"]
```

**Validation on load:**
- Must be parseable JSON
- Must be an array
- Every element must be a non-empty string of 1–50 characters
- Any element matching a built-in name (case-insensitively) is silently removed

### Transaction Schema (unchanged)

The existing transaction schema is unchanged. The `category` field now accepts any string from the active category list (built-ins + custom). On rename/delete, transactions are updated in place.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | unique, non-empty |
| `name` | string | 1–100 chars after trim |
| `amount` | number | 0.01 – 999,999,999.99 |
| `category` | string | any active category name (built-in or custom) |
| `createdAt` | number | `Date.now()` at creation |

### In-Memory State (extended)

```js
// Existing
let transactions = [];     // Transaction[]

// New
let customCategories = []; // string[] — custom category names in creation order

// New — session-scoped; rebuilt on load
const categoryColorMap = {}; // { [name: string]: hex_color_string }
```

### Active Category List (computed)

```js
// Always computed from state — never stored as a separate variable
function getActiveCategories() {
  return ['Food', 'Transport', 'Fun'].concat(customCategories);
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid category names always pass validation

*For any* non-empty string of 1–50 characters that does not case-insensitively match any name in the current active category list, `validateCategoryName` SHALL return null (no error).

**Validates: Requirements 1.2, 3.3**

---

### Property 2: Invalid category names are always rejected

*For any* string that is empty after trimming, exceeds 50 characters, or matches an existing category name case-insensitively, `validateCategoryName` SHALL return a non-null error string and the custom category list SHALL remain unchanged after any attempted creation or rename.

**Validates: Requirements 1.2, 1.3, 1.4, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3**

---

### Property 3: Category list always starts with built-ins in fixed order

*For any* collection of custom categories and any sequence of create/rename/delete operations, the active category list returned by `getActiveCategories()` SHALL always begin with `['Food', 'Transport', 'Fun']` in that exact order, followed by custom categories in creation order.

**Validates: Requirements 2.1, 6.1, 7.1, 7.3**

---

### Property 4: Custom category storage round-trip

*For any* valid array of custom category name strings, serializing it to LocalStorage as JSON and then reading and parsing it back via `loadCustomCategories()` SHALL produce an array that is value-equivalent to the original (same names in same order, after deduplication of any built-in conflicts).

**Validates: Requirements 5.1, 5.2**

---

### Property 5: Malformed custom category storage produces empty custom list

*For any* value stored at `CATEGORY_STORAGE_KEY` that is not parseable as JSON, or is valid JSON but not an array of non-empty strings ≤50 characters, `loadCustomCategories()` SHALL return an empty array and the app SHALL initialize with only the three built-in categories.

**Validates: Requirements 5.4, 8.5**

---

### Property 6: Renamed category is reflected in all transactions

*For any* collection of transactions where some have `category === oldName`, after a successful rename from `oldName` to `newName`, every transaction that previously referenced `oldName` SHALL have `category === newName` and no transaction in the collection SHALL reference `oldName`.

**Validates: Requirements 3.6, 3.9**

---

### Property 7: Deleted category causes reassignment to "Fun" and balance is preserved

*For any* collection of transactions containing some assigned to a deleted custom category, after deletion: (a) no transaction SHALL reference the deleted category name, (b) all previously-assigned transactions SHALL have `category === 'Fun'`, and (c) the total balance (sum of all `amount` fields) SHALL equal the balance before deletion.

**Validates: Requirements 4.3, 4.4, 4.6**

---

### Property 8: Transaction validator accepts exactly the active category set

*For any* active category list (built-ins + current custom categories), `isValidCategory` SHALL return `true` for every name in that list and `false` for any string not in that list.

**Validates: Requirements 7.4**

---

### Property 9: Category colors are unique per session

*For any* set of up to 12 active custom categories created within a session, each SHALL be assigned a distinct hex color from the PALETTE array (no two custom categories share the same color in that set of 12).

**Validates: Requirements 6.3, 6.4**

---

### Property 10: Validation messages are reset before each new submission attempt

*For any* sequence of two consecutive submission attempts in the Category_Manager, the error messages displayed after the second attempt SHALL reflect only the validation result of the second submission (no stale errors from the first attempt SHALL persist).

**Validates: Requirements 8.7**

---

## Error Handling

### Category Name Validation Errors
- Displayed as inline `<span class="error-msg" id="cm-name-error">` adjacent to the input field.
- Cleared at the start of each new submission attempt before re-validating.
- Empty name → `"Category name is required."`
- Name > 50 chars → `"Category name must be 50 characters or fewer."`
- Duplicate name (case-insensitive) → `"A category with this name already exists."`

### Rename Validation Errors
- Displayed as `<span class="error-msg cm-rename-error">` within the editing row.
- Same messages as above applied to rename context.
- Escape or Cancel reverts the row to display state with no errors.

### LocalStorage Write Failure (Category Operations)
- For **create**: if `saveCustomCategories()` fails, the category is NOT added to `customCategories[]` and the dropdown is NOT updated. Inline error shown.
- For **rename** (per Req 3.10): in-memory state is updated even on write failure. Persistent error shown: *"Warning: Your change could not be saved. It will be lost when you close this tab."*
- For **delete** (per Req 4.7): in-memory state is updated even on write failure. Same persistent error message.
- Persistent errors clear on the next successful LocalStorage write.

### LocalStorage Read Failure (on init)
- Malformed JSON or invalid array → reset to `[]`, initialize with only built-ins.
- Error shown: *"Could not load saved custom categories. Your previous categories may be corrupted."* (dismissible via existing notification dismiss button).

### Maximum Category Limit
- When `customCategories.length >= 20`, the `#cm-add-btn` is disabled via `btn.disabled = true` and given `aria-disabled="true"`.
- An inline note is shown adjacent to the button: *"Maximum of 20 custom categories reached."*
- The limit is re-evaluated and the button state updated after every create/delete operation.

### Edge Cases

| Scenario | Behavior |
|---|---|
| Category renamed while a transaction is being added | `updateDropdown()` is synchronous; the new name appears immediately |
| Delete of a category whose name matches a built-in (impossible by design) | `handleDeleteCategory()` guards: only proceeds if name is in `customCategories[]` |
| Load from storage contains `"Food"` as a custom category | Silently deduplicated during `loadCustomCategories()` — not treated as error |
| Rename to the same name (unchanged) | Detected by `validateCategoryName` with `selfName` exclusion: passes validation, but result is identical — treated as a no-op |
| 12+ custom categories exhaust the color palette | Colors cycle back: `PALETTE[index % 12]`; colors may repeat for the 13th+ category |
| LocalStorage unavailable entirely (private browsing) | Same `try/catch` pattern as existing `saveTransactions()` — error shown, in-memory state remains functional |

---

## Testing Strategy

### Unit Tests (example-based)

| Function | Test Cases |
|---|---|
| `validateCategoryName()` | Empty string → error; whitespace-only → error; 50-char name → valid; 51-char name → error; duplicate (case-insensitive match) → error; self-rename with same name → valid |
| `loadCustomCategories()` | `null` in storage → `[]`; valid array → parsed; malformed JSON → `[]` + error; non-array → `[]` + error; item with empty string → `[]` + error; item with 51-char string → `[]` + error; array containing `"Food"` → `"Food"` deduplicated silently |
| `getActiveCategories()` | Empty custom list → `['Food','Transport','Fun']`; with customs → built-ins first then customs |
| `assignColor()` | First custom → PALETTE[0]; second → PALETTE[1]; 13th → PALETTE[0] (wrap) |
| Rename update logic | Transaction with old category name → updated to new name; transactions with other categories → unchanged |
| Delete reassignment | Transactions with deleted category → reassigned to `'Fun'`; others unchanged; balance unchanged |

### Property-Based Tests

Property-based testing is performed using **fast-check** (already installed as `"fast-check": "^3.22.0"` in `package.json`), run via Node's built-in test runner (`node --test`).

Each property test runs a minimum of **100 iterations**.

| Property | Test Tag |
|---|---|
| Property 1: Valid category names always pass validation | `Feature: custom-categories, Property 1: Valid category names always pass validation` |
| Property 2: Invalid category names are always rejected | `Feature: custom-categories, Property 2: Invalid category names are always rejected` |
| Property 3: Category list always starts with built-ins in fixed order | `Feature: custom-categories, Property 3: Category list always starts with built-ins in fixed order` |
| Property 4: Custom category storage round-trip | `Feature: custom-categories, Property 4: Custom category storage round-trip` |
| Property 5: Malformed custom category storage produces empty custom list | `Feature: custom-categories, Property 5: Malformed custom category storage produces empty custom list` |
| Property 6: Renamed category is reflected in all transactions | `Feature: custom-categories, Property 6: Renamed category is reflected in all transactions` |
| Property 7: Deleted category causes reassignment to "Fun" and balance is preserved | `Feature: custom-categories, Property 7: Deleted category causes reassignment to "Fun" and balance is preserved` |
| Property 8: Transaction validator accepts exactly the active category set | `Feature: custom-categories, Property 8: Transaction validator accepts exactly the active category set` |
| Property 9: Category colors are unique per session | `Feature: custom-categories, Property 9: Category colors are unique per session` |
| Property 10: Validation messages are reset before each new submission attempt | `Feature: custom-categories, Property 10: Validation messages are reset before each new submission attempt` |

### Integration / Smoke Tests

- Reload the page after creating/renaming/deleting categories; verify all custom categories are restored correctly from LocalStorage.
- Fill `CATEGORY_STORAGE_KEY` with malformed JSON manually; reload and verify error notification and fallback to built-ins only.
- Create a transaction with a custom category, then rename that category; verify the transaction list shows the updated category name.
- Create a transaction with a custom category, then delete that category; verify the transaction is now classified under "Fun" and the balance is unchanged.
- Attempt to create a 21st custom category; verify the Add button is disabled and no category is added.
- Verify chart shows a new slice when a transaction is added with a custom category.
- Verify chart removes a slice when all transactions of a zero-total custom category are deleted (but the category still exists).
- Verify WCAG AA contrast ratios for new Category_Manager UI elements using Lighthouse or axe.
- Resize viewport to 320px; verify the Category_Manager section stacks correctly in single-column layout.
