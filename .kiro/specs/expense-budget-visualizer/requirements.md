# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize transactions, and visualize spending distribution through an interactive pie chart. Built with plain HTML, CSS, and Vanilla JavaScript, the app stores all data locally in the browser using the Local Storage API — no backend or account setup required. The goal is a clean, minimal tool that gives users immediate visual feedback on where their money is going.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category
- **Category**: A classification label for a Transaction; one of: Food, Transport, or Fun
- **Transaction_List**: The scrollable UI component that displays all recorded Transactions
- **Input_Form**: The HTML form containing fields for item name, amount, and category, plus a submit button
- **Balance_Display**: The UI element at the top of the App that shows the total sum of all Transaction amounts
- **Chart**: The pie chart component (rendered via Chart.js) that visualizes spending distribution by Category
- **Local_Storage**: The browser's Web Storage API used to persist Transaction data client-side
- **Validator**: The client-side logic responsible for checking that all Input_Form fields are filled before submission

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category and submit it, so that the transaction is recorded in my expense list.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name (maximum 100 characters), a numeric field for amount, and a dropdown selector for category (Food, Transport, Fun).
2. THE Input_Form SHALL contain a submit button that, WHEN activated, triggers transaction recording.
3. WHEN the submit button is activated, THE Validator SHALL verify that the item name field is non-empty, the amount field contains a positive numeric value between 0.01 and 999,999,999.99 inclusive, and a category has been selected.
4. IF the Validator detects any empty or invalid field, THEN THE Input_Form SHALL display an inline validation message identifying which field is missing or invalid, and SHALL NOT record the Transaction.
5. WHEN all fields pass validation, THE App SHALL create a new Transaction and append it to the Transaction_List.
6. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state, with the category dropdown returning to its unselected placeholder.

---

### Requirement 2: Display the Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction's item name, amount formatted as a currency value with a currency symbol and two decimal places, and category label.
2. WHILE the number of Transactions causes the list to exceed its fixed-height container, THE Transaction_List SHALL be independently scrollable; no other UI element SHALL be clipped, hidden, or repositioned as a result.
3. THE Transaction_List SHALL render Transactions in the order they were added, with the most recent entry at the top.
4. WHEN the App loads and Local_Storage contains previously saved Transactions, THE Transaction_List SHALL restore and display all stored Transactions.
5. WHEN no Transactions exist, THE Transaction_List SHALL display an empty-state message (e.g., "No transactions yet") in place of the list.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a clearly labeled delete button (e.g., "Delete" or "×") for each Transaction entry.
2. WHEN the delete button for a Transaction is activated, THE App SHALL immediately remove that Transaction from the Transaction_List without requiring a confirmation step.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds.
4. WHEN a Transaction is deleted, THE Chart SHALL update to reflect the new category distribution within 500 milliseconds.
5. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction collection to Local_Storage so the deleted Transaction does not reappear on next load.
6. IF the Local_Storage write fails during deletion, THEN THE App SHALL display an inline error message informing the user that the change could not be persisted, without reverting the in-memory deletion.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see my total expenditure at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned at the top of the App's main content area and remain visible without scrolling.
2. THE Balance_Display SHALL show the sum of all Transaction amounts formatted with a currency symbol and exactly two decimal places (e.g., "$0.00").
3. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total within 300 milliseconds.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the reduced total within 300 milliseconds.
5. WHEN no Transactions exist, THE Balance_Display SHALL show "$0.00".

---

### Requirement 5: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending broken down by category, so that I can quickly understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart where each slice represents a Category, and each slice's proportional angle corresponds to that Category's summed Transaction amounts relative to the total of all Transaction amounts.
2. THE Chart SHALL assign a distinct color to each Category (Food, Transport, Fun) such that no two categories share the same color, and each category's color remains the same across all renders.
3. WHEN a Transaction is added, THE Chart SHALL update immediately, without requiring a page reload.
4. WHEN a Transaction is deleted, THE Chart SHALL update immediately, without requiring a page reload.
5. WHEN no Transactions exist, THE Chart SHALL display a visible text message (e.g., "No data to display") in place of the chart.
6. WHEN a Category has a total summed amount of zero, that Category SHALL be excluded from the Chart.

---

### Requirement 6: Persist Data in Local Storage

**User Story:** As a user, I want my transactions to be saved across browser sessions, so that I do not lose my data when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL serialize the updated Transaction collection as JSON and write it to Local_Storage before the UI acknowledges the addition.
2. WHEN a Transaction is deleted, THE App SHALL serialize the updated Transaction collection as JSON and write it to Local_Storage before the UI acknowledges the deletion.
3. WHEN the App initializes, THE App SHALL read and parse the Transaction collection from Local_Storage and restore the Transaction_List, Balance_Display, and Chart to reflect the stored data before the UI becomes interactive.
4. IF Local_Storage is empty or contains no valid Transaction data, THEN THE App SHALL initialize with an empty Transaction_List, a zero Balance_Display, and an empty Chart state.
5. IF Local_Storage contains data that is malformed (i.e., not parseable as JSON or missing required Transaction fields: item name, amount, category), THEN THE App SHALL discard the malformed data, initialize with an empty state, and display an inline error message informing the user that previously saved data could not be loaded.

---

### Requirement 7: Technical Constraints

**User Story:** As a developer, I want the app built with plain HTML, CSS, and Vanilla JavaScript with no backend, so that it is lightweight, easy to maintain, and deployable as a standalone file or browser extension.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript without any frontend frameworks (e.g., React, Vue, Angular) or third-party JavaScript utility libraries (e.g., lodash, jQuery).
2. THE App SHALL require no backend server; all logic and data storage SHALL operate entirely client-side.
3. THE App SHALL, in the stable browser versions available at time of testing, produce no uncaught JavaScript errors, have all features operational, and exhibit no browser-specific rendering failures in Chrome, Firefox, Edge, and Safari.
4. THE App's CSS SHALL be contained in a single file located at `css/style.css`.
5. THE App's JavaScript SHALL be contained in a single file located at `js/app.js`.
6. WHERE Chart.js is used for the Chart, THE App SHALL load it from a public CDN and SHALL NOT bundle it locally.
7. IF the Chart.js CDN fails to load, THEN THE App SHALL display an error message indicating the chart is unavailable, without crashing or impairing any other feature.

---

### Requirement 8: Performance and Visual Design

**User Story:** As a user, I want the app to load quickly and respond instantly to my interactions, so that using it feels smooth and does not interrupt my workflow.

#### Acceptance Criteria

1. WHERE the user's network connection provides at least 25 Mbps download speed and a round-trip latency of 50 ms or less, THE App SHALL render a visible and interactive initial UI within 2 seconds of the page being requested.
2. WHEN a Transaction is added or deleted, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 100 milliseconds.
3. THE App SHALL present text elements such that all normal-sized body text meets a contrast ratio of at least 4.5:1 against its background (WCAG AA), and no body text SHALL be rendered at a font size smaller than 14px.
4. THE App SHALL be responsive such that at viewport widths from 320px to 1920px, no interactive element is overlapping, clipped, or hidden, and no horizontal scrollbar is present.
