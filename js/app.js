(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────

  const STORAGE_KEY = 'expense_visualizer_transactions';

  const CATEGORIES = ['Food', 'Transport', 'Fun'];

  const MAX_AMOUNT = 999999999.99;
  const MIN_AMOUNT = 0.01;
  const MAX_NAME_LENGTH = 100;

  const CATEGORY_COLORS = {
    Food:      '#FF6384',
    Transport: '#36A2EB',
    Fun:       '#FFCE56',
  };

  // ─── State ───────────────────────────────────────────────────────────────────

  /** @type {Array<{id: string, name: string, amount: number, category: string, createdAt: number}>} */
  let transactions = [];

  /** @type {import('chart.js').Chart|null} */
  let chartInstance = null;

  // ─── Validator ───────────────────────────────────────────────────────────────

  /**
   * Returns true if name is non-empty after trimming and within max length.
   * @param {string} name
   * @returns {boolean}
   */
  function isValidName(name) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    return trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH;
  }

  /**
   * Returns true if amount is a finite number (or parseable as one) in [0.01, 999,999,999.99].
   * Rejects NaN, Infinity, non-numeric strings, and out-of-range values.
   * @param {*} amount
   * @returns {boolean}
   */
  function isValidAmount(amount) {
    // Reject non-string / non-number types other than what parseFloat handles
    if (typeof amount === 'boolean' || amount === null || amount === undefined) {
      return false;
    }
    // If it's a string, ensure it contains only a valid numeric literal (no trailing garbage)
    if (typeof amount === 'string') {
      const trimmed = amount.trim();
      if (trimmed === '') return false;
      // Reject strings with non-numeric characters (allow leading minus, one dot)
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return false;
    }
    const num = Number(amount);
    return Number.isFinite(num) && num >= MIN_AMOUNT && num <= MAX_AMOUNT;
  }

  /**
   * Returns true if cat is strictly one of the allowed categories.
   * @param {string} cat
   * @returns {boolean}
   */
  function isValidCategory(cat) {
    return CATEGORIES.includes(cat);
  }

  /**
   * Validates the form fields and returns an error object.
   * Each field is null if valid, or a user-friendly error string if invalid.
   * @param {string} name
   * @param {*} amount
   * @param {string} category
   * @returns {{ name: string|null, amount: string|null, category: string|null }}
   */
  function validateForm(name, amount, category) {
    return {
      name:     isValidName(name)     ? null : 'Item name is required (max 100 characters).',
      amount:   isValidAmount(amount) ? null : 'Amount must be a number between 0.01 and 999,999,999.99.',
      category: isValidCategory(category) ? null : 'Please select a valid category.',
    };
  }

  // ─── Storage ─────────────────────────────────────────────────────────────────

  /**
   * Shows or hides the #notification banner.
   * @param {string|null} message  - Text to display. Pass null/empty to hide.
   * @param {boolean}     [persistent=false] - If true the banner stays until explicitly cleared;
   *                                           if false it auto-dismisses after 4 seconds.
   */
  function showNotification(message, persistent) {
    const el = document.getElementById('notification');
    if (!el) return;

    if (!message) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }

    // Clear content and rebuild so we can inject a dismiss button
    el.innerHTML = '';

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    el.appendChild(msgSpan);

    // Inject a dismiss (×) button so the banner is dismissible (Req 9.2)
    const closeBtn = document.createElement('button');
    closeBtn.id = 'notification-close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function () {
      el.style.display = 'none';
      el.innerHTML = '';
      if (showNotification._timer) {
        clearTimeout(showNotification._timer);
        showNotification._timer = null;
      }
    });
    el.appendChild(closeBtn);

    el.style.display = 'block';

    // Clear any previously scheduled auto-dismiss timer
    if (showNotification._timer) {
      clearTimeout(showNotification._timer);
      showNotification._timer = null;
    }

    if (!persistent) {
      showNotification._timer = setTimeout(function () {
        el.style.display = 'none';
        el.innerHTML = '';
        showNotification._timer = null;
      }, 4000);
    }
  }
  /** @type {number|null} */
  showNotification._timer = null;

  /**
   * Validates that a single parsed item conforms to the Transaction schema.
   * All five fields must be present with the correct types.
   * @param {*} item
   * @returns {boolean}
   */
  function isValidTransactionShape(item) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.id !== 'string'       || item.id.trim() === '')        return false;
    if (typeof item.name !== 'string'     || item.name.trim() === '')      return false;
    if (typeof item.amount !== 'number'   || !Number.isFinite(item.amount)) return false;
    if (typeof item.category !== 'string' || !CATEGORIES.includes(item.category)) return false;
    if (typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt))   return false;
    return true;
  }

  /**
   * Reads STORAGE_KEY from localStorage, parses JSON, and validates every item.
   * On any failure (missing key, bad JSON, or invalid shape) the data is discarded,
   * transactions is reset to [], and an error notification is shown.
   * @returns {Array<{id:string,name:string,amount:number,category:string,createdAt:number}>}
   */
  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      // Nothing stored yet — treat as clean empty state, no error shown
      if (raw === null) {
        transactions = [];
        return transactions;
      }

      const parsed = JSON.parse(raw);

      // Must be an array
      if (!Array.isArray(parsed)) {
        throw new Error('Stored data is not an array.');
      }

      // Every element must match the Transaction schema
      for (let i = 0; i < parsed.length; i++) {
        if (!isValidTransactionShape(parsed[i])) {
          throw new Error('Transaction at index ' + i + ' has an invalid shape.');
        }
      }

      transactions = parsed;
      return transactions;

    } catch (_err) {
      transactions = [];
      showNotification(
        'Could not load saved transactions. Your previous data may be corrupted.',
        false
      );
      return transactions;
    }
  }

  /**
   * Serializes the current transactions array to JSON and writes it to localStorage.
   * On failure the in-memory state is NOT reverted; a persistent error notification is shown.
   */
  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
      // Clear any lingering save-error notification on success
      const el = document.getElementById('notification');
      if (el && el.dataset.saveError === 'true') {
        showNotification(null);
        delete el.dataset.saveError;
      }
    } catch (_err) {
      const el = document.getElementById('notification');
      if (el) el.dataset.saveError = 'true';
      showNotification(
        'Warning: Your change could not be saved. It will be lost when you close this tab.',
        true  // persistent — stays until next successful save or page reload
      );
    }
  }

  // ─── Renderer ────────────────────────────────────────────────────────────────

  /**
   * Formats a number as a USD currency string with exactly two decimal places.
   * e.g. 1234.56 → "$1,234.56", 0 → "$0.00"
   * @param {number} amount
   * @returns {string}
   */
  function formatCurrency(amount) {
    return 'Rp\u00a0' + Number(amount).toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  /**
   * Sums all transaction amounts and updates the #balance-value DOM element.
   * Shows "$0.00" when there are no transactions.
   */
  function updateBalance() {
    const el = document.getElementById('balance-value');
    if (!el) return;

    const total = transactions.reduce(function (sum, tx) {
      return sum + tx.amount;
    }, 0);

    el.textContent = formatCurrency(total);
  }

  /**
   * Clears #transaction-list and re-renders all transactions in reverse insertion order
   * (most recent first, sorted by createdAt descending).
   * When transactions is empty, renders a single empty-state message item instead.
   */
  function renderList() {
    const ul = document.getElementById('transaction-list');
    if (!ul) return;

    // Clear existing content
    ul.innerHTML = '';

    if (transactions.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty-msg';
      li.textContent = 'No transactions yet';
      ul.appendChild(li);
      return;
    }

    // Sort by createdAt descending (most recent first), without mutating the original array
    const sorted = transactions.slice().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });

    sorted.forEach(function (tx) {
      const li = document.createElement('li');
      li.dataset.id = tx.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'tx-name';
      nameSpan.textContent = tx.name;

      const categorySpan = document.createElement('span');
      categorySpan.className = 'tx-category';
      categorySpan.textContent = tx.category;

      const amountSpan = document.createElement('span');
      amountSpan.className = 'tx-amount';
      amountSpan.textContent = formatCurrency(tx.amount);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
      deleteBtn.textContent = '×';

      li.appendChild(nameSpan);
      li.appendChild(categorySpan);
      li.appendChild(amountSpan);
      li.appendChild(deleteBtn);

      ul.appendChild(li);
    });
  }

  /**
   * Initialises the Chart.js pie chart on #spending-chart.
   *
   * If Chart.js failed to load from the CDN (typeof Chart === 'undefined') the
   * canvas is hidden and a visible error message is injected into #chart-container
   * instead.  All other features are unaffected.
   *
   * Must be called once during app initialisation (DOMContentLoaded).
   */
  function initChart() {
    const container = document.getElementById('chart-container');
    const canvas    = document.getElementById('spending-chart');

    // Guard: Chart.js CDN failed to load
    if (typeof Chart === 'undefined') {
      if (canvas) canvas.style.display = 'none';
      if (container) {
        const errMsg = document.createElement('p');
        errMsg.id = 'chart-unavailable-msg';
        errMsg.textContent = 'Chart unavailable: could not load Chart.js.';
        container.appendChild(errMsg);
      }
      return;
    }

    if (!canvas) return;

    chartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: CATEGORIES.slice(),
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: CATEGORIES.map(function (cat) { return CATEGORY_COLORS[cat]; }),
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend:  { position: 'bottom' },
          tooltip: { enabled: true },
        },
      },
    });
  }

  /**
   * Aggregates transaction amounts per category, then either:
   * - Shows #chart-empty-msg and hides the canvas when there are no transactions, or
   * - Filters out zero-total categories, updates chartInstance.data, and calls
   *   chartInstance.update() to re-render immediately.
   *
   * Safe to call even when Chart.js failed to load (chartInstance will be null).
   */
  function updateChart() {
    const canvas   = document.getElementById('spending-chart');
    const emptyMsg = document.getElementById('chart-empty-msg');

    // Aggregate totals per category
    const totals = {};
    CATEGORIES.forEach(function (cat) { totals[cat] = 0; });
    transactions.forEach(function (tx) {
      if (totals.hasOwnProperty(tx.category)) {
        totals[tx.category] += tx.amount;
      }
    });

    const hasData = transactions.length > 0;

    // Toggle empty-state message and canvas visibility
    if (emptyMsg) emptyMsg.style.display = hasData ? 'none' : '';
    if (canvas)   canvas.style.display   = hasData ? ''     : 'none';

    // Nothing more to do if there's no chart instance (CDN failure or no data)
    if (!chartInstance) return;

    if (!hasData) {
      // Reset chart data so it's clean for when transactions are added again
      chartInstance.data.labels                  = [];
      chartInstance.data.datasets[0].data        = [];
      chartInstance.data.datasets[0].backgroundColor = [];
      chartInstance.update();
      return;
    }

    // Filter out categories whose total is zero (Req 5.6)
    const activeCategories = CATEGORIES.filter(function (cat) { return totals[cat] > 0; });

    chartInstance.data.labels                  = activeCategories.slice();
    chartInstance.data.datasets[0].data        = activeCategories.map(function (cat) { return totals[cat]; });
    chartInstance.data.datasets[0].backgroundColor = activeCategories.map(function (cat) { return CATEGORY_COLORS[cat]; });
    chartInstance.update();
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  /**
   * Handles the transaction form's 'submit' event.
   *
   * Steps:
   *  1. Prevents the native browser form submission.
   *  2. Reads #item-name, #amount, #category values.
   *  3. Clears any existing inline error messages.
   *  4. Validates via validateForm(); if any errors exist, renders inline
   *     <span class="error-msg"> text for each invalid field and returns early.
   *  5. On valid input: constructs a Transaction object, unshifts it into
   *     transactions[], persists via saveTransactions(), refreshes the UI
   *     (updateBalance, renderList, updateChart), and resets the form.
   *
   * @param {Event} event
   */
  function handleFormSubmit(event) {
    event.preventDefault();

    // ── 1. Read field values ──────────────────────────────────────────────────
    const nameInput     = document.getElementById('item-name');
    const amountInput   = document.getElementById('amount');
    const categoryInput = document.getElementById('category');

    const nameValue     = nameInput     ? nameInput.value     : '';
    const amountValue   = amountInput   ? amountInput.value   : '';
    const categoryValue = categoryInput ? categoryInput.value : '';

    // ── 2. Clear previous inline error messages ───────────────────────────────
    var errorNameEl     = document.getElementById('item-name-error');
    var errorAmountEl   = document.getElementById('amount-error');
    var errorCategoryEl = document.getElementById('category-error');

    if (errorNameEl)     errorNameEl.textContent     = '';
    if (errorAmountEl)   errorAmountEl.textContent   = '';
    if (errorCategoryEl) errorCategoryEl.textContent = '';

    // ── 3. Validate ───────────────────────────────────────────────────────────
    var errors = validateForm(nameValue, amountValue, categoryValue);
    var hasErrors = errors.name !== null || errors.amount !== null || errors.category !== null;

    if (hasErrors) {
      // Render inline error messages next to each invalid field
      if (errors.name     && errorNameEl)     errorNameEl.textContent     = errors.name;
      if (errors.amount   && errorAmountEl)   errorAmountEl.textContent   = errors.amount;
      if (errors.category && errorCategoryEl) errorCategoryEl.textContent = errors.category;
      return; // Do not modify state
    }

    // ── 4. Create Transaction object ──────────────────────────────────────────
    var newId;
    try {
      newId = crypto.randomUUID();
    } catch (_e) {
      newId = Date.now().toString() + Math.random();
    }

    /** @type {{id: string, name: string, amount: number, category: string, createdAt: number}} */
    var transaction = {
      id:        newId,
      name:      nameValue.trim(),
      amount:    parseFloat(amountValue),
      category:  categoryValue,
      createdAt: Date.now(),
    };

    // ── 5. Update state and persist ───────────────────────────────────────────
    transactions.unshift(transaction);
    saveTransactions();

    // ── 6. Refresh UI ─────────────────────────────────────────────────────────
    updateBalance();
    renderList();
    updateChart();

    // ── 7. Reset form ─────────────────────────────────────────────────────────
    var form = document.getElementById('transaction-form');
    if (form) form.reset();
  }

  /**
   * Handles click events on #transaction-list via event delegation.
   *
   * Steps:
   *  1. Returns early if the clicked target is not a .delete-btn element.
   *  2. Reads the data-id attribute from the parent <li> element.
   *  3. Filters the transactions array to remove the entry with the matching id.
   *  4. Persists the updated array via saveTransactions().
   *  5. Refreshes the UI: updateBalance(), renderList(), updateChart().
   *
   * Per Req 3.2: removal is immediate, no confirmation required.
   * Per Req 3.3: Balance_Display updates within 500ms (synchronous call).
   * Per Req 3.4: Chart updates within 500ms (synchronous call).
   * Per Req 3.5: updated collection written to LocalStorage via saveTransactions().
   * Per Req 3.6: saveTransactions() shows a persistent error on write failure
   *              without reverting the in-memory deletion.
   *
   * @param {MouseEvent} event
   */
  function handleDeleteClick(event) {
    // 1. Guard: only handle clicks on the delete button
    if (!event.target.classList.contains('delete-btn')) {
      return;
    }

    // 2. Find the parent <li> and read its data-id
    var li = event.target.closest('li');
    if (!li) return;

    var id = li.dataset.id;
    if (!id) return;

    // 3. Remove the matching transaction from state
    transactions = transactions.filter(function (tx) {
      return tx.id !== id;
    });

    // 4. Persist updated collection
    saveTransactions();

    // 5. Refresh UI
    updateBalance();
    renderList();
    updateChart();
  }

  // ─── Initialisation ──────────────────────────────────────────────────────────

  /**
   * App entry point — runs after the DOM is fully parsed.
   * Loads persisted transactions, initialises the chart, renders the UI,
   * and attaches all event listeners.
   */
  function init() {
    loadTransactions();
    initChart();
    updateBalance();
    renderList();
    updateChart();

    // Wire up form submit handler
    var form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    // Wire up delete click handler via event delegation on the transaction list
    var list = document.getElementById('transaction-list');
    if (list) {
      list.addEventListener('click', handleDeleteClick);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();
