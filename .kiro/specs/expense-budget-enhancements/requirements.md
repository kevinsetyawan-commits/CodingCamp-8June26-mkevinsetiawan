# Requirements Document

## Introduction

This document specifies three enhancement features for the existing Expense & Budget Visualizer application — a client-side single-page app built with plain HTML, CSS, and Vanilla JavaScript (IIFE architecture, Chart.js v4 via CDN, LocalStorage persistence).

The three enhancements are:

1. **Dark/Light Mode Toggle** — Users can switch the UI between a dark and a light color theme. The chosen preference is persisted in LocalStorage so it survives page reloads and browser restarts.
2. **Custom Categories** — Users can create and delete their own expense categories in addition to the three built-in defaults (Food, Transport, Fun). Custom categories appear in the transaction form's category dropdown and are persisted in LocalStorage.
3. **Monthly Summary View** — Users can browse a dedicated monthly summary panel that groups all transactions by calendar month, displaying the total amount spent per month and the per-category breakdown for the selected month.

All enhancements must integrate into the existing single-file architecture (`js/app.js`, `css/style.css`, `index.html`) without introducing external libraries, build tools, or backend services.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: An existing expense entry with fields `id`, `name`, `amount`, `category`, and `createdAt`
- **Category**: A classification label for a Transaction; either one of the three built-in labels (Food, Transport, Fun) or a user-defined Custom_Category
- **Custom_Category**: A user-defined category name stored in LocalStorage alongside the built-in categories
- **Category_List**: The ordered set of all categories currently available in the App — built-in categories followed by Custom_Categories in the order they were created
- **Transaction_Form**: The HTML form in `#form-section` used to add new transactions (item name, amount, category dropdown, submit button)
- **Category_Dropdown**: The `<select>` element inside Transaction_Form from which the user picks a Category
- **Category_Manager**: The UI sub-panel in `#form-section` that contains the input field and button for adding a Custom_Category, and renders the list of existing Custom_Categories with individual delete buttons
- **Theme_Toggle**: The button (or equivalent interactive control) that switches the App between the light and dark color theme
- **Theme**: A named color-scheme configuration applied to the App's CSS; either `"light"` or `"dark"`
- **Monthly_Summary**: The UI panel that displays transactions grouped by calendar month and filtered by a user-selected month
- **Month_Selector**: The `<select>` or equivalent control inside Monthly_Summary that lets the user choose which calendar month to view
- **Local_Storage**: The browser's Web Storage API used to persist data client-side
- **STORAGE_KEY**: The existing LocalStorage key `"expense_visualizer_transactions"` for transaction data
- **THEME_KEY**: The new LocalStorage key `"expense_visualizer_theme"` for the user's Theme preference
- **CATEGORIES_KEY**: The new LocalStorage key `"expense_visualizer_categories"` for the user-defined Custom_Categories list
- **Balance_Display**: The existing `#balance-display` element in the sticky header
- **Chart**: The existing Chart.js pie chart visualising spending by Category

---

## Requirements

### Requirement 1: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between a dark and a light color theme, so that I can use the app comfortably in different lighting conditions and according to my personal preference.

#### Acceptance Criteria

1. THE App SHALL render a Theme_Toggle control that is visible in the sticky header at all viewport widths from 320px to 1920px without overlapping any other header element.
2. WHEN the Theme_Toggle is activated, THE App SHALL switch the active Theme from `"light"` to `"dark"` or from `"dark"` to `"light"`, updating all visible colors (background, text, borders, form elements, cards, the Chart legend, the chart canvas background, and chart tooltips) within 100 milliseconds.
3. THE Theme_Toggle SHALL have an accessible name (via `aria-label` or visible text) that identifies its current action (e.g., "Switch to dark mode" or "Switch to light mode"), SHALL display a visible icon or text label indicating the currently active Theme, and SHALL have a minimum touch target size of 44×44 pixels.
4. WHEN the Theme is switched, THE App SHALL write the new Theme value (`"light"` or `"dark"`) to Local_Storage under THEME_KEY so the preference is persisted.
5. WHEN the App initializes, THE App SHALL read THEME_KEY from Local_Storage and apply the stored Theme before any user input event is processed; IF THEME_KEY is absent or contains an unrecognized value, THE App SHALL default to the `"light"` Theme.
6. WHEN the dark Theme is active, all normal-sized body text SHALL meet a contrast ratio of at least 4.5:1 against its background (WCAG AA), and no body text SHALL be rendered at a font size smaller than 14px.
7. WHEN the light Theme is active, all normal-sized body text SHALL meet a contrast ratio of at least 4.5:1 against its background (WCAG AA), and no body text SHALL be rendered at a font size smaller than 14px.

---

### Requirement 2: Custom Categories

**User Story:** As a user, I want to define my own expense categories beyond Food, Transport, and Fun, so that I can accurately classify my personal spending.

#### Acceptance Criteria

1. THE App SHALL display a Category_Manager in `#form-section` that contains a text input field (maximum 50 characters) and an "Add Category" button for creating a Custom_Category.
2. WHEN the "Add Category" button is activated, THE App SHALL validate that the input field is non-empty after trimming, contains between 1 and 50 characters, does not duplicate (case-insensitively) any name already in the Category_List, and does not cause the total number of Custom_Categories to exceed 20; IF any validation condition fails, THE App SHALL display a dismissible inline error message identifying the failure and SHALL NOT add the category.
3. WHEN a valid Custom_Category name is submitted, THE App SHALL append the new Custom_Category to the Category_List, update the Category_Dropdown so the new category appears as a selectable option, and clear the Category_Manager input field — all without requiring a page reload.
4. WHEN a Custom_Category is added, THE App SHALL write the updated Custom_Category list to Local_Storage under CATEGORIES_KEY before the Category_Dropdown is updated in the UI.
5. THE Category_Manager SHALL render a delete button for each Custom_Category, where each button has an accessible name (via `aria-label` or visible text) that uniquely identifies the category it deletes (e.g., `aria-label="Delete Travel"`).
6. WHEN the delete button for a Custom_Category is activated, THE App SHALL remove that Custom_Category from the Category_List and update the Category_Dropdown to remove the corresponding option, without requiring a page reload.
7. WHEN a Custom_Category is deleted, THE App SHALL write the updated Custom_Category list to Local_Storage under CATEGORIES_KEY before the Category_Dropdown option is removed from the UI.
8. WHEN a Custom_Category that has associated Transactions is deleted, THE App SHALL retain those existing Transactions unchanged; only new transaction entries using that category SHALL no longer be possible via the Category_Dropdown.
9. THE App SHALL NOT permit deletion of the three built-in categories (Food, Transport, Fun).
10. WHEN the App initializes, THE App SHALL read CATEGORIES_KEY from Local_Storage, parse the stored Custom_Category list, and add each Custom_Category to the Category_Dropdown and Category_Manager in the order they were originally created; IF CATEGORIES_KEY is absent or contains invalid data, THE App SHALL initialize with an empty Custom_Category list and display no error.
11. THE Chart SHALL assign a distinct, consistent color to each Custom_Category such that no two active categories share the same color across all renders; "distinct" means the color is visually differentiable from the colors of all other active categories and from the three built-in category colors (`#FF6384`, `#36A2EB`, `#FFCE56`).
12. WHEN the Category_Dropdown is populated, the built-in categories (Food, Transport, Fun) SHALL appear first in their original order, followed by Custom_Categories in the order they were created.

---

### Requirement 3: Monthly Summary View

**User Story:** As a user, I want to view my spending grouped by calendar month, so that I can track trends over time and understand my budget month by month.

#### Acceptance Criteria

1. THE App SHALL display a Monthly_Summary panel that is accessible from the main UI without requiring a page reload (e.g., as a collapsible section, a tab, or a toggle button).
2. THE Monthly_Summary SHALL contain a Month_Selector that lists every calendar month for which at least one Transaction exists, formatted as "MMMM YYYY" (e.g., "January 2025"), in descending chronological order (most recent month first); WHEN the Monthly_Summary is first shown, the most recent month SHALL be auto-selected.
3. WHEN the Month_Selector value changes, THE Monthly_Summary SHALL update the displayed total and per-category breakdown within 100 milliseconds to reflect only the Transactions that belong to the selected month.
4. THE Monthly_Summary SHALL display the total amount spent in the selected month, formatted with the same currency symbol used by Balance_Display and exactly two decimal places.
5. THE Monthly_Summary SHALL display a per-category breakdown for the selected month, showing each Category name and its total spent amount (formatted as currency) for that month; categories with a zero total for the selected month SHALL be omitted from the breakdown.
6. WHEN no Transactions exist for the selected month (or when no Transactions exist at all), THE Monthly_Summary SHALL display a non-empty text message rendered in the breakdown area (e.g., "No transactions for this month") in place of the total and per-category breakdown.
7. WHEN a Transaction is added or deleted, THE Monthly_Summary SHALL refresh the Month_Selector options and, if the currently selected month still has transactions, refresh the summary data within 100 milliseconds; IF the currently selected month no longer has transactions after a deletion, THE App SHALL remove that month from the Month_Selector and auto-select the most recent remaining month (or show the empty state if no months remain).
8. WHEN the App initializes, THE Monthly_Summary SHALL derive its data from the in-memory Transaction collection loaded from Local_Storage; no additional Local_Storage key is required for the Monthly_Summary.
9. THE Monthly_Summary SHALL assign each Transaction to a calendar month based on the `createdAt` timestamp field, interpreted in the user's local timezone.

---

### Requirement 4: Integration and Technical Constraints

**User Story:** As a developer, I want all three enhancements to integrate cleanly into the existing single-file architecture, so that the app remains lightweight, maintainable, and free of regressions.

#### Acceptance Criteria

1. ALL three enhancements SHALL be implemented by modifying only `js/app.js`, `css/style.css`, and `index.html`; no new JavaScript files, CSS files, HTML pages, build tools, or external libraries beyond the existing Chart.js CDN SHALL be introduced.
2. WHEN any enhancement is active, THE App SHALL produce no uncaught JavaScript errors and all existing features SHALL continue to function correctly: (a) submitting the form with valid inputs adds a transaction and updates Balance_Display, Transaction_List, and Chart; (b) clicking a delete button removes the transaction and updates Balance_Display, Transaction_List, and Chart; (c) LocalStorage correctly persists transactions across page reloads; (d) malformed LocalStorage data for transactions initializes to empty state with an error notification.
3. WHILE viewport width is between 320px and 1920px inclusive, no interactive element introduced by any enhancement SHALL be overlapping, clipped, or hidden, and no horizontal scrollbar SHALL be present.
4. WHEN CATEGORIES_KEY data in Local_Storage is malformed or unparseable, THE App SHALL discard the malformed data, initialize with an empty Custom_Category list, and display no error to the user (silent recovery).
5. IF the Local_Storage write for CATEGORIES_KEY fails, THEN THE App SHALL display an inline error message inside the Category_Manager panel informing the user that the category change could not be persisted, without reverting the in-memory state.
6. IF the Local_Storage write for THEME_KEY fails, THEN THE App SHALL apply the new Theme to the current session but silently continue without displaying an error, since the failure is non-critical.
7. WHEN a Transaction is validated on form submission or loaded from Local_Storage, THE App SHALL accept both built-in categories (Food, Transport, Fun) and any Custom_Category currently in the Category_List as valid category values; a Transaction whose category matches a Custom_Category SHALL pass validation and SHALL NOT be discarded on load.
8. WHEN the Chart is rendered with Custom_Categories, THE Chart SHALL include slices for Custom_Categories that have a non-zero total, using the consistent distinct color assigned to each Custom_Category per Requirement 2 Criterion 11.
