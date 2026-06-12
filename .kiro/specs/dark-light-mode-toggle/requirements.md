# Requirements Document

## Introduction

The Dark/Light Mode Toggle is an enhancement to the existing Expense & Budget Visualizer application. It adds a user-accessible button that switches the entire app between a dark and a light color theme. The chosen preference is persisted in the browser's LocalStorage so that the same theme is applied automatically on every subsequent visit. The feature must integrate seamlessly into the existing single-file CSS and Vanilla JavaScript architecture without introducing any build step, framework, or third-party library.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application
- **Theme**: A named set of CSS color values applied to the App's UI; one of `light` or `dark`
- **Light_Theme**: The default color scheme that uses light backgrounds and dark foreground text (the App's existing style)
- **Dark_Theme**: An alternative color scheme that uses dark backgrounds and light foreground text
- **Toggle_Button**: The interactive UI control that switches the active Theme between `light` and `dark`
- **Theme_Manager**: The JavaScript logic responsible for applying, switching, and persisting the active Theme
- **Local_Storage**: The browser's Web Storage API used to persist the user's Theme preference across sessions
- **System_Preference**: The operating-system-level color scheme setting exposed to browsers via the `prefers-color-scheme` CSS media feature

---

## Requirements

### Requirement 1: Toggle Button

**User Story:** As a user, I want a clearly visible button in the app header, so that I can switch between dark and light mode at any time.

#### Acceptance Criteria

1. THE App SHALL render a Toggle_Button inside the existing `<header>` element that has non-zero dimensions and is not hidden (i.e., not `display:none`, `visibility:hidden`, or `opacity:0`) at all viewport widths from 320px to 1920px.
2. WHEN the Light_Theme is active, THE Toggle_Button SHALL display a label or icon that communicates switching to dark mode (e.g., "Switch to Dark Mode" or a moon icon).
3. WHEN the Dark_Theme is active, THE Toggle_Button SHALL display a label or icon that communicates switching to light mode (e.g., "Switch to Light Mode" or a sun icon).
4. WHEN the Light_Theme is active, THE Toggle_Button SHALL have an `aria-label` attribute value that describes the action of switching to dark mode (e.g., `"Switch to dark mode"`).
5. WHEN the Dark_Theme is active, THE Toggle_Button SHALL have an `aria-label` attribute value that describes the action of switching to light mode (e.g., `"Switch to light mode"`).
6. THE Toggle_Button SHALL have a rendered click/touch target of at least 44×44 CSS pixels (WCAG 2.5.5).
7. THE Toggle_Button SHALL be reachable via the Tab key and, WHEN focused via keyboard navigation, SHALL display a non-zero CSS outline or equivalent visible focus indicator (WCAG 2.4.7).

---

### Requirement 2: Theme Switching

**User Story:** As a user, I want clicking the toggle button to immediately change the entire app's color scheme, so that I can comfortably use the app in different lighting conditions.

#### Acceptance Criteria

1. WHEN the Toggle_Button is activated while the Light_Theme is active, THE Theme_Manager SHALL switch the active Theme to Dark_Theme.
2. WHEN the Toggle_Button is activated while the Dark_Theme is active, THE Theme_Manager SHALL switch the active Theme to Light_Theme.
3. WHEN the Theme is switched, the new Theme SHALL be fully visible across all UI regions within 200 milliseconds of the Toggle_Button activation; no region SHALL remain styled with the previous Theme's colors after this window.
4. WHEN the Dark_Theme is active, THE App SHALL apply a dark background color and light foreground text color to all visible UI regions, including the header, form section, transaction list section, and chart section, each meeting a contrast ratio of at least 4.5:1 (WCAG AA).
5. WHEN the Light_Theme is active, THE App SHALL apply the original light background color and dark foreground text color to all visible UI regions, matching the App's pre-toggle color scheme.
6. THE Theme_Manager SHALL apply theming by toggling a `dark-mode` CSS class on the `<body>` element, with all Theme-specific color values defined as CSS rules scoped to that class in `css/style.css`.

---

### Requirement 3: Persist Theme Preference

**User Story:** As a user, I want my theme preference to be remembered across browser sessions, so that I do not have to re-select my preferred theme every time I open the app.

#### Acceptance Criteria

1. WHEN the user activates the Toggle_Button, THE Theme_Manager SHALL write the newly active Theme identifier (`"light"` or `"dark"`) to Local_Storage under the key `"expense_visualizer_theme"`.
2. WHEN the App initializes, THE Theme_Manager SHALL read the Theme preference from Local_Storage and apply the corresponding Theme synchronously before any styled content is painted.
3. IF Local_Storage does not contain a value at `"expense_visualizer_theme"`, THEN THE Theme_Manager SHALL apply the Light_Theme as the default.
4. IF Local_Storage contains a value at `"expense_visualizer_theme"` that is neither `"light"` nor `"dark"`, THEN THE Theme_Manager SHALL discard it and apply the Light_Theme.
5. IF a Local_Storage read or write operation throws an exception, THEN THE Theme_Manager SHALL continue to apply and switch Themes in-memory for the current session without displaying an error or interrupting other features.
6. THE active Theme is defined by a `data-theme` attribute on the `<html>` element set to either `"light"` or `"dark"`; all Theme-switching and persistence operations SHALL update this attribute as their sole mechanism for activating a Theme.

---

### Requirement 4: Dark Theme Color Contrast

**User Story:** As a user, I want the dark theme to remain readable and accessible, so that text and interactive elements are clearly visible against dark backgrounds.

#### Acceptance Criteria

1. WHILE the Dark_Theme is active (Toggle_Button previously activated to switch to dark), THE App SHALL render all normal-sized body text at a contrast ratio of at least 4.5:1 against its immediate background color (WCAG AA).
2. WHILE the Dark_Theme is active, THE App SHALL render all interactive element labels (form labels, button text, delete button text) at a contrast ratio of at least 4.5:1 against their background color (WCAG AA).
3. WHILE the Dark_Theme is active, THE App SHALL render all input fields and dropdown selectors with a background color and text color that together meet a contrast ratio of at least 4.5:1 (WCAG AA).
4. WHILE the Dark_Theme is active, THE App's header text and balance value SHALL be rendered at a foreground-to-background contrast ratio of at least 4.5:1 (WCAG AA).
5. WHILE the Dark_Theme is active, keyboard focus indicators on all interactive elements SHALL meet a contrast ratio of at least 3:1 against the adjacent background color (WCAG AA non-text contrast).

---

### Requirement 5: Chart Legibility in Dark Theme

**User Story:** As a user, I want the spending chart to remain legible when dark mode is active, so that I can still read category labels and the empty-state message.

#### Acceptance Criteria

1. WHILE the Dark_Theme is active, all text rendered within the Chart area (including legend labels and any category name labels) SHALL meet a contrast ratio of at least 4.5:1 against the chart panel background (WCAG AA).
2. WHILE the Dark_Theme is active and no Transactions exist, THE App SHALL display the chart empty-state message with a foreground-to-background contrast ratio of at least 4.5:1 (WCAG AA).
3. THE Chart's per-category slice colors (Food: `#FF6384`, Transport: `#36A2EB`, Fun: `#FFCE56`) SHALL be identical in both the Light_Theme and Dark_Theme.
4. WHILE the Dark_Theme is active, each pie slice color SHALL achieve a contrast ratio of at least 3:1 against the chart panel background color (WCAG AA non-text contrast).

---

### Requirement 6: No Disruption to Existing Features

**User Story:** As a developer, I want the dark/light mode toggle to integrate without breaking any existing app functionality, so that adding theming does not introduce regressions.

#### Acceptance Criteria

1. WHEN either Theme is active, THE App SHALL correctly add Transactions (item appears in Transaction_List), update the Balance_Display by the exact transaction amount, and persist the Transaction to the `"expense_visualizer_transactions"` LocalStorage key.
2. WHEN either Theme is active, THE Balance_Display SHALL always show the arithmetic sum of all Transaction amounts, updating within 300 milliseconds of any Transaction addition or deletion.
3. WHEN either Theme is active, THE Chart SHALL render a pie slice for every Category with a non-zero summed Transaction amount and omit slices for zero-total Categories, updating within 500 milliseconds of any Transaction change.
4. THE Theme_Manager SHALL use the LocalStorage key `"expense_visualizer_theme"`, which SHALL be distinct from `"expense_visualizer_transactions"`, so that the two keys never conflict or overwrite each other.
5. THE App SHALL implement all Theme-specific CSS rules within the existing `css/style.css` file and SHALL NOT create any additional stylesheet files.
6. THE Theme_Manager logic SHALL be implemented within the existing `js/app.js` file and SHALL NOT introduce additional JavaScript files or third-party libraries.
7. THE Theme_Manager SHALL apply theming exclusively by setting `data-theme="dark"` or `data-theme="light"` on the `<html>` element; no other theming mechanism SHALL be introduced.
