# Requirements Document

## Introduction

The Monthly Summary View is a new feature for the Expense & Budget Visualizer that groups and summarizes the user's expense transactions by calendar month. Instead of reviewing a flat, chronological list of all transactions, users can switch to a month-oriented view that shows the total spending per month, a per-category breakdown for that month, and the individual transactions that belong to it. The feature is added entirely client-side, using the same plain HTML, CSS, and Vanilla JavaScript stack as the existing app, and reads directly from the same `transactions` array and LocalStorage data.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense entry with an `id`, `name`, `amount`, `category`, and `createdAt` timestamp, as defined in the existing app
- **Category**: A classification label for a Transaction; one of: `Food`, `Transport`, or `Fun`
- **Monthly_Summary**: An aggregated data record representing all Transactions whose `createdAt` timestamp falls within a single calendar month, including the month label, total spending, and per-category subtotals
- **Summary_View**: The UI section that displays Monthly_Summary records and replaces (or augments) the default Transaction_List when the user activates the monthly view mode
- **Month_Card**: A single collapsible card inside the Summary_View representing one Monthly_Summary; it shows the month label, total spending, category breakdown, and optionally the individual transactions for that month
- **View_Toggle**: The UI control (button or tab) that switches the App between the default transaction list view and the Summary_View
- **Active_Month**: The Month_Card that is currently expanded to show its transaction detail rows
- **Local_Storage**: The browser's Web Storage API used to persist Transaction data client-side
- **Balance_Display**: The existing UI element that shows the sum of all transaction amounts across all time

---

## Requirements

### Requirement 1: View Toggle Control

**User Story:** As a user, I want a clearly visible control to switch between the default transaction list and the monthly summary view, so that I can choose the level of detail I need without losing my transaction data.

#### Acceptance Criteria

1. THE App SHALL display a View_Toggle control within the same content section as the Transaction_List that allows the user to switch between "Transactions" view and "Monthly Summary" view.
2. WHEN the App loads, THE View_Toggle SHALL default to the "Transactions" view, preserving the existing behavior.
3. WHEN the user clicks or presses Enter or Space on the "Monthly Summary" option on the View_Toggle, THE App SHALL hide the Transaction_List and display the Summary_View in its place.
4. WHEN the user clicks or presses Enter or Space on the "Transactions" option on the View_Toggle, THE App SHALL hide the Summary_View and display the Transaction_List in its place.
5. THE View_Toggle SHALL visually indicate which view is currently active via a visually distinct style that does not rely on color alone AND by setting `aria-pressed="true"` or `aria-selected="true"` on the active option.
6. WHILE the Summary_View is the active view, WHEN the user adds or deletes a Transaction, THE App SHALL keep only the Summary_View visible and update it to reflect the change without switching to the Transaction_List view.

---

### Requirement 2: Monthly Grouping and Aggregation

**User Story:** As a user, I want to see my transactions grouped by calendar month, so that I can understand my spending patterns over time.

#### Acceptance Criteria

1. THE App SHALL group all Transactions by the calendar month and year derived from each Transaction's `createdAt` timestamp using the browser's local timezone (e.g., "June 2025", "May 2025").
2. THE App SHALL compute a Monthly_Summary for each group containing: the month label (full month name and four-digit year), the total spending (sum of all Transaction amounts in that month formatted as `$X,XXX.XX`), and the per-category subtotal for each of `Food`, `Transport`, and `Fun` (each also formatted as `$X,XXX.XX`).
3. THE Summary_View SHALL display one Month_Card per Monthly_Summary, ordered from most recent month to oldest month.
4. IF no Transactions exist, THEN THE Summary_View SHALL display a visible empty-state message (e.g., "No transactions to summarize") in place of any Month_Cards.
5. IF all Transactions in the data set belong to the same calendar month, THEN THE Summary_View SHALL display exactly one Month_Card for that month.
6. IF Transactions span multiple calendar months, THEN THE Summary_View SHALL display one Month_Card per distinct month, with each card containing only the Transactions from that month.

---

### Requirement 3: Month Card Display

**User Story:** As a user, I want each month card to show me a clear summary of my spending for that month, so that I can quickly compare months at a glance.

#### Acceptance Criteria

1. THE Month_Card SHALL display the month label formatted as the full locale month name followed by a four-digit year (e.g., "June 2025") as a heading, derived from the `createdAt` timestamps of the Transactions in that group using the browser's local timezone.
2. WHEN Transactions change or the App initializes, THE Month_Card SHALL display the total spending for that month formatted using the app's `formatCurrency` function (currency symbol, comma-separated thousands, two decimal places).
3. THE Month_Card SHALL display a per-category breakdown showing the subtotal for each of the three Categories in the order `Food`, `Transport`, `Fun`, with each subtotal formatted using `formatCurrency`, including Categories with a zero subtotal.
4. IF all three Categories have a zero subtotal for a given month, THEN THE Month_Card SHALL still display all three Categories in the breakdown in the order `Food`, `Transport`, `Fun`, each showing `$0.00`.
5. THE Month_Card layout SHALL not truncate or clip any text content at viewport widths from 320px to 1920px.

---

### Requirement 4: Expandable Transaction Detail

**User Story:** As a user, I want to expand a month card to see the individual transactions within that month, so that I can investigate the details behind the summary totals.

#### Acceptance Criteria

1. THE Month_Card SHALL contain an expand/collapse control (e.g., a button or clickable header) that toggles visibility of the transaction detail rows for that month.
2. WHEN a Month_Card is rendered, it SHALL default to a collapsed state with transaction detail rows hidden.
3. IF a Month_Card is in the collapsed state, WHEN the expand control is activated, THE App SHALL display the individual Transaction rows for that month beneath the summary information within 100ms.
4. IF a Month_Card is in the expanded state, WHEN the expand control is activated, THE App SHALL collapse it and hide the transaction detail rows within 100ms.
5. WHEN transaction detail rows are displayed, each row SHALL show the Transaction's item name, category, and amount formatted using `formatCurrency`.
6. WHEN transaction detail rows are displayed, they SHALL be ordered with the most recent transaction first (descending by `createdAt`).
7. IF an Active_Month exists, WHEN the user activates the expand control on a different Month_Card, THE App SHALL collapse the previously Active_Month and expand the newly selected card.
8. IF no Active_Month exists, WHEN the user activates the expand control on a Month_Card, THE App SHALL expand that card without any collapse side-effect.

---

### Requirement 5: Summary View Chart Integration

**User Story:** As a user, I want to see a chart that reflects the currently displayed month's spending when I expand a month card, so that I get a visual breakdown alongside the numerical summary.

#### Acceptance Criteria

1. WHILE the Summary_View is active and no Month_Card is expanded, THE existing Chart SHALL reflect the spending distribution across all Transactions (same behavior as the default view).
2. WHEN a Month_Card is expanded, THE Chart SHALL update to show the spending distribution for only the Transactions in that expanded month within 300ms of the expand action.
3. WHEN a Month_Card is collapsed and no other card is expanded, THE Chart SHALL revert to showing the distribution across all Transactions within 300ms.
4. WHEN the expanded Month_Card's Transactions result in only one active Category, THE Chart SHALL display a single full-circle slice for that Category.
5. IF a Month_Card with no transactions of a given Category is expanded, THEN that Category SHALL be excluded from the Chart (consistent with existing Requirement 5.6 behavior).

---

### Requirement 6: Data Consistency

**User Story:** As a user, I want the monthly summary to always reflect the current state of my transaction data, so that the summaries remain accurate after I add or delete transactions.

#### Acceptance Criteria

1. WHEN a Transaction is added or deleted, THE App SHALL recompute the Monthly_Summary record for the calendar month and year matching that Transaction's `createdAt` timestamp within 100ms.
2. IF the Summary_View is currently active, WHEN a Monthly_Summary record is recomputed, THE App SHALL re-render the affected Month_Card within 100ms of the recomputation.
3. WHEN the last Transaction belonging to a given calendar month is deleted, THE App SHALL remove the corresponding Month_Card from the Summary_View.
4. AT ALL TIMES, the sum of the total spending values displayed across all visible Month_Cards SHALL equal the value shown in the Balance_Display.
5. WHEN the App initializes and Local_Storage contains previously saved Transactions, THE App SHALL group those Transactions by calendar month and year, compute per-month totals and per-category subtotals, and make the Summary_View ready to display before the UI becomes interactive.

---

### Requirement 7: Accessibility and Responsive Design

**User Story:** As a user, I want the monthly summary view to be accessible and readable on any screen size, so that I can use it on both desktop and mobile devices.

#### Acceptance Criteria

1. THE View_Toggle control SHALL be receivable via Tab key focus and operable via the Enter or Space key.
2. THE expand/collapse control on each Month_Card SHALL be receivable via Tab key focus and operable via the Enter or Space key.
3. THE expand/collapse control SHALL have an `aria-expanded` attribute set to `"true"` when the Month_Card is expanded and `"false"` when it is collapsed.
4. THE Summary_View SHALL present all text elements at a contrast ratio of at least 4.5:1 against their background (WCAG AA).
5. No text in the Summary_View SHALL be rendered at a font size smaller than 14px.
6. IF the number of Month_Cards exceeds five, THEN THE Summary_View container SHALL become vertically scrollable, with the Balance_Display and View_Toggle remaining fully visible and unobscured.
7. THE Summary_View layout SHALL be responsive such that at viewport widths from 320px to 1920px, no element is clipped outside the viewport boundary and no horizontal scrollbar is introduced by the Summary_View.
