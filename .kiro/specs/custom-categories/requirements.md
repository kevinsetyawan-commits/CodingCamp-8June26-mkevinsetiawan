# Requirements Document

## Introduction

The Custom Categories feature extends the Expense & Budget Visualizer by allowing users to create, rename, and delete their own spending categories beyond the three built-in ones (Food, Transport, Fun). Users can build a category list tailored to their own spending habits — for example, adding "Health", "Rent", or "Entertainment" — while the app continues to operate entirely client-side, persisting all category data in LocalStorage alongside transactions. Built-in categories are always present and cannot be removed or renamed, ensuring backward compatibility with existing transaction data.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Built_In_Category**: One of the three original, immutable categories: Food, Transport, or Fun
- **Custom_Category**: A user-defined category created through the Category_Manager; subject to create, rename, and delete operations
- **Category**: A classification label for a Transaction; may be either a Built_In_Category or a Custom_Category
- **Category_Manager**: The UI panel or section that lists all current categories and exposes controls to add, rename, and delete them
- **Category_Name**: A non-empty string of 1–50 characters used to identify a Category
- **Input_Form**: The existing HTML form used to add transactions; its category dropdown must reflect all current Categories
- **Transaction**: An existing expense entry consisting of an item name, a monetary amount, and a Category
- **Transaction_List**: The existing scrollable UI component that displays all recorded Transactions
- **Balance_Display**: The existing UI element that shows the total sum of all Transaction amounts
- **Chart**: The existing pie chart rendered via Chart.js that visualizes spending by Category
- **Local_Storage**: The browser's Web Storage API used to persist all app data client-side
- **Validator**: The client-side logic responsible for validating Input_Form fields before submission
- **Category_Storage_Key**: The LocalStorage key dedicated to storing the list of Custom_Categories (`expense_visualizer_custom_categories`)

---

## Requirements

### Requirement 1: Create a Custom Category

**User Story:** As a user, I want to create a new custom category with a name of my choosing, so that I can classify transactions under labels that match my personal spending habits.

#### Acceptance Criteria

1. WHEN the confirmation control in the Category_Manager is activated, THE App SHALL attempt to create a new Custom_Category using the trimmed value of the Category_Name input field.
2. WHEN the confirmation control is activated, THE Validator SHALL verify that the trimmed Category_Name is non-empty and contains at most 50 characters.
3. IF the Validator detects that the Category_Name is empty after trimming or exceeds 50 characters, THEN THE Category_Manager SHALL display an inline validation message adjacent to the input field and SHALL NOT create the Custom_Category.
4. WHEN the confirmation control is activated with a Category_Name that is identical (case-insensitively) to any existing Category (Built_In or Custom), THEN THE Category_Manager SHALL display an inline error message stating the name already exists, and SHALL NOT create a duplicate Category.
5. WHEN a new Custom_Category is successfully created and persisted to Local_Storage, THE App SHALL add it to the Input_Form's category dropdown within 100 milliseconds.
6. WHEN a new Custom_Category is successfully created, THE App SHALL write the updated Custom_Category list to Local_Storage before displaying a visible success indication to the user.
7. IF the Local_Storage write fails during creation, THEN THE App SHALL display an inline error message and SHALL NOT add the new Custom_Category to the Input_Form dropdown, preventing a UI/storage inconsistency.
8. WHEN a new Custom_Category is successfully created, THE Category_Manager's input field SHALL be set to an empty string value.

---

### Requirement 2: Display All Categories

**User Story:** As a user, I want to see all available categories — including built-in and custom ones — listed clearly, so that I know what options exist and can manage them.

#### Acceptance Criteria

1. THE Category_Manager SHALL display all current Categories in a single unified list, with Built_In_Categories (Food, Transport, Fun in that fixed order) appearing first, followed by Custom_Categories in creation order.
2. THE Category_Manager SHALL display a visible text label (e.g., "Built-in") on each Built_In_Category entry and no such label on Custom_Category entries, so the user can distinguish them.
3. THE Category_Manager SHALL render rename and delete controls only for Custom_Categories; Built_In_Categories (Food, Transport, Fun) SHALL NOT have rename or delete controls.
4. WHEN the App loads and Local_Storage contains previously saved Custom_Categories, THE Category_Manager SHALL restore and display all stored Custom_Categories alongside Food, Transport, and Fun.
5. IF no Custom_Categories have been created, THEN THE Category_Manager SHALL display only Food, Transport, and Fun.
6. THE Category_Manager SHALL support a maximum of 20 Custom_Categories; WHEN 20 Custom_Categories exist, THE confirmation control for adding a new category SHALL be disabled.
7. IF a Local_Storage write fails during any Custom_Category operation, THEN THE App SHALL display an inline error message and SHALL NOT update the Category_Manager list or the Input_Form dropdown until the write succeeds.

---

### Requirement 3: Rename a Custom Category

**User Story:** As a user, I want to rename an existing custom category, so that I can correct a misspelling or give it a more accurate label as my habits change.

#### Acceptance Criteria

1. THE Category_Manager SHALL provide a rename control for each Custom_Category.
2. WHEN the rename control is activated on a Custom_Category, THE App SHALL transition that category row into an editable state displaying the current Category_Name in an input field.
3. WHEN the user confirms a rename, THE Validator SHALL verify that the new Category_Name is non-empty after trimming and contains at most 50 characters.
4. IF the Validator detects that the new Category_Name is empty after trimming or exceeds 50 characters, THEN THE Category_Manager SHALL display an inline validation message and SHALL NOT apply the rename.
5. WHEN the user confirms a rename with a new Category_Name that is identical (case-insensitively) to any existing Category other than the one being renamed, THEN THE Category_Manager SHALL display an inline error message and SHALL NOT apply the rename.
6. WHEN a Custom_Category is successfully renamed, THE App SHALL update the Category_Name in every Transaction that was assigned to the old Category_Name so that no Transaction references a non-existent Category.
7. WHEN a Custom_Category is successfully renamed, THE App SHALL update the Input_Form's category dropdown to reflect the new Category_Name.
8. WHEN a Custom_Category is successfully renamed, THE App SHALL update the Chart legend and slice label to use the new Category_Name.
9. WHEN a Custom_Category is successfully renamed, THE App SHALL persist the updated Custom_Category list and the updated Transaction collection to Local_Storage.
10. IF the Local_Storage write fails during rename, THEN THE App SHALL display an inline error message that persists until the next successful write or page reload, without reverting the in-memory rename.
11. WHEN the user presses Escape or activates a cancel button on the editable row, THE Category_Manager SHALL revert the editable state to the display state without modifying any data.

---

### Requirement 4: Delete a Custom Category

**User Story:** As a user, I want to delete a custom category I no longer need, so that the category list stays clean and relevant.

#### Acceptance Criteria

1. THE Category_Manager SHALL provide a delete control for each Custom_Category; Built_In_Categories (Food, Transport, Fun) SHALL NOT have a delete control.
2. WHEN the delete control for a Custom_Category is activated, THE App SHALL remove that Custom_Category from the Category_Manager list and from the Input_Form's category dropdown within 100 milliseconds.
3. WHEN a Custom_Category is deleted, THE App SHALL reassign all Transactions whose category matches the deleted Custom_Category name (exact string match) to "Fun", so that no Transaction references a non-existent Category.
4. WHEN a Custom_Category is deleted, THE Balance_Display value SHALL remain unchanged.
5. WHEN a Custom_Category is deleted, THE Chart SHALL update to reflect the revised category distribution within 100 milliseconds.
6. WHEN a Custom_Category is deleted, THE App SHALL persist the updated Custom_Category list and the updated Transaction collection to Local_Storage.
7. IF the Local_Storage write fails during deletion, THEN THE App SHALL display an inline error message that persists until the next successful Local_Storage write or page reload, without reverting the in-memory deletion.
8. THE Input_Form's category dropdown SHALL always include Food, Transport, and Fun regardless of any Custom_Category deletion.

---

### Requirement 5: Category Persistence

**User Story:** As a user, I want my custom categories to be saved across browser sessions, so that I do not have to recreate them every time I open the app.

#### Acceptance Criteria

1. THE App SHALL store the Custom_Category list as a JSON-serialized array of Category_Name strings under Category_Storage_Key in Local_Storage, separate from the Transaction storage key.
2. WHEN the App initializes, THE App SHALL read the Custom_Category list from Local_Storage, deduplicate any names that conflict case-insensitively with Built_In_Categories, and merge the result with Food, Transport, Fun (Built_In first, then Custom in stored order) to form the complete active Category list before the UI becomes interactive.
3. IF Local_Storage is empty or contains no data at Category_Storage_Key, THEN THE App SHALL initialize with only Food, Transport, and Fun available.
4. IF Local_Storage contains data at Category_Storage_Key that is malformed (not parseable as JSON or not an array of non-empty strings of at most 50 characters each), THEN THE App SHALL discard the malformed data, initialize with only the Built_In_Categories, and display an inline error message.
5. WHEN a Custom_Category is created, THE App SHALL write the updated Custom_Category list to Local_Storage before the UI reflects the change.
6. WHEN a Custom_Category is renamed, THE App SHALL write the updated Custom_Category list and the updated Transaction collection to Local_Storage before the UI reflects the change.
7. WHEN a Custom_Category is deleted, THE App SHALL write the updated Custom_Category list and the updated Transaction collection to Local_Storage before the UI reflects the change.

---

### Requirement 6: Input Form and Chart Integration

**User Story:** As a user, I want the transaction form and spending chart to reflect my current category list at all times, so that I can use custom categories immediately and see them in the chart without extra steps.

#### Acceptance Criteria

1. THE Input_Form's category dropdown SHALL always list all current Categories (Built_In_Categories first in fixed order Food/Transport/Fun, then Custom_Categories in creation order).
2. WHEN the Custom_Category list changes, THE Input_Form's category dropdown SHALL update synchronously in the same render cycle, without requiring a page reload.
3. WHEN a Transaction is added using a Custom_Category, THE Chart SHALL render a slice for that Custom_Category using the first available color from a fixed 12-slot palette (distinct from colors already assigned to other currently rendered slices).
4. THE App SHALL assign a color to each Custom_Category at creation time for the session (page load to page unload); the same Custom_Category SHALL always use its assigned color across all Chart renders within that session.
5. WHEN a Custom_Category is deleted and its Transactions are reassigned to "Fun", THE Chart SHALL remove that Custom_Category's slice and add the reassigned amounts to the "Fun" slice.
6. WHEN all Transactions belonging to a Custom_Category have been deleted (but the Custom_Category itself still exists), THE Chart SHALL exclude that Custom_Category's slice from the rendered chart.

---

### Requirement 7: Built-In Category Immutability

**User Story:** As a user, I want the default Food, Transport, and Fun categories to always be available, so that existing transactions are never left without a valid category.

#### Acceptance Criteria

1. THE App SHALL always include Food, Transport, and Fun in the complete active Category list, regardless of any Custom_Category operations.
2. THE Category_Manager SHALL NOT render rename or delete controls for Food, Transport, or Fun.
3. WHEN the App initializes and the stored Custom_Category list is applied, THE App SHALL ensure Food, Transport, and Fun are present in the active Category list regardless of the stored data.
4. THE Validator SHALL accept Food, Transport, Fun, and any currently active Custom_Category as valid category values for Transaction submission, and SHALL reject any other value.

---

### Requirement 8: Validation and Error Handling

**User Story:** As a developer and user, I want all category management actions to be validated and errors communicated clearly, so that the app never enters an inconsistent state.

#### Acceptance Criteria

1. THE Validator SHALL reject a Category_Name that is empty after trimming and display the inline message: "Category name is required."
2. THE Validator SHALL reject a Category_Name that exceeds 50 characters and display the inline message: "Category name must be 50 characters or fewer."
3. THE Validator SHALL reject a Category_Name that duplicates any existing Category name (case-insensitively, including all Built_In_Categories and all Custom_Categories) and display the inline message: "A category with this name already exists."
4. IF a Local_Storage write fails after any Custom_Category change, THEN THE App SHALL display an inline error message that persists until the next successful Local_Storage write or page reload: "Warning: Your change could not be saved. It will be lost when you close this tab."
5. IF a Local_Storage read fails during App initialization for the Category_Storage_Key, THEN THE App SHALL display an inline error message that can be dismissed by the user: "Could not load saved custom categories. Your previous categories may be corrupted."
6. WHEN an inline validation or error message is displayed in the Category_Manager, THE Input_Form SHALL remain submittable, THE Transaction_List SHALL remain interactive, THE Balance_Display SHALL continue updating, and THE Chart SHALL continue rendering.
7. WHEN the user makes a new submission attempt in the Category_Manager, THE App SHALL clear all previously displayed validation messages before re-validating the new input.
