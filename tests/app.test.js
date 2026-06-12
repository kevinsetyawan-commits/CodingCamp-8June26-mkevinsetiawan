/**
 * Property-based tests for Expense & Budget Visualizer
 *
 * Uses fast-check (https://fast-check.io) with Node's built-in test runner.
 * Run: npm test   (or: node --test tests/app.test.js)
 *
 * Because app.js is an IIFE (not a CommonJS module), the pure logic functions
 * are re-implemented verbatim here so they can be imported and tested in isolation.
 * Any change to the originals in app.js should be mirrored here.
 */

'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fc       = require('fast-check');

// ─── Pure logic re-implemented from app.js ───────────────────────────────────
// Keep these in sync with the corresponding functions in js/app.js.

const CATEGORIES    = ['Food', 'Transport', 'Fun'];
const MAX_AMOUNT    = 999999999.99;
const MIN_AMOUNT    = 0.01;
const MAX_NAME_LENGTH = 100;

function isValidName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH;
}

function isValidAmount(amount) {
  if (typeof amount === 'boolean' || amount === null || amount === undefined) {
    return false;
  }
  if (typeof amount === 'string') {
    const trimmed = amount.trim();
    if (trimmed === '') return false;
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return false;
  }
  const num = Number(amount);
  return Number.isFinite(num) && num >= MIN_AMOUNT && num <= MAX_AMOUNT;
}

function isValidCategory(cat) {
  return CATEGORIES.includes(cat);
}

function validateForm(name, amount, category) {
  return {
    name:     isValidName(name)         ? null : 'Item name is required (max 100 characters).',
    amount:   isValidAmount(amount)     ? null : 'Amount must be a number between 0.01 and 999,999,999.99.',
    category: isValidCategory(category) ? null : 'Please select a valid category.',
  };
}

function formatCurrency(amount) {
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isValidTransactionShape(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string'        || item.id.trim() === '')         return false;
  if (typeof item.name !== 'string'      || item.name.trim() === '')       return false;
  if (typeof item.amount !== 'number'    || !Number.isFinite(item.amount)) return false;
  if (typeof item.category !== 'string'  || !CATEGORIES.includes(item.category)) return false;
  if (typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt))    return false;
  return true;
}

/**
 * Simulates loadTransactions() without DOM / localStorage: given a raw string
 * (as it would come from localStorage.getItem), returns the parsed array or []
 * along with whether an error was triggered.
 */
function simulateLoad(raw) {
  if (raw === null) {
    return { transactions: [], error: false };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not array');
    for (let i = 0; i < parsed.length; i++) {
      if (!isValidTransactionShape(parsed[i])) {
        throw new Error('invalid shape at ' + i);
      }
    }
    return { transactions: parsed, error: false };
  } catch (_) {
    return { transactions: [], error: true };
  }
}

/**
 * Compute balance from a transaction array (mirrors updateBalance logic).
 */
function computeBalance(txArray) {
  return txArray.reduce(function (sum, tx) { return sum + tx.amount; }, 0);
}

/**
 * Compute category totals for chart (mirrors updateChart aggregation logic).
 */
function computeCategoryTotals(txArray) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  txArray.forEach(function (tx) {
    if (Object.prototype.hasOwnProperty.call(totals, tx.category)) {
      totals[tx.category] += tx.amount;
    }
  });
  return totals;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Valid item name: 1–100 non-whitespace-only characters */
const validNameArb = fc.stringOf(
  fc.char().filter(c => c !== '\n' && c !== '\r'),
  { minLength: 1, maxLength: 100 }
).filter(s => s.trim().length > 0 && s.trim().length <= 100);

/** Valid amount: double in [0.01, 999_999_999.99], rounded to 2dp to avoid float drift */
const validAmountArb = fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true })
  .map(n => Math.round(n * 100) / 100)
  .filter(n => n >= 0.01 && n <= 999999999.99);

/** Valid category: one of the three allowed values */
const validCategoryArb = fc.constantFrom(...CATEGORIES);

/** A valid Transaction object */
const validTransactionArb = fc.record({
  id:        fc.uuid(),
  name:      validNameArb,
  amount:    validAmountArb,
  category:  validCategoryArb,
  createdAt: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
});

/**
 * An array of valid transactions with UNIQUE ids (0–20 items).
 * Deduplication by id is required so delete-by-id always removes exactly one item.
 */
const validTransactionArrayArb = fc.array(validTransactionArb, { minLength: 0, maxLength: 20 })
  .map(arr => {
    const seen = new Set();
    return arr.filter(tx => { if (seen.has(tx.id)) return false; seen.add(tx.id); return true; });
  });

/** A non-empty array of valid transactions with unique ids */
const nonEmptyTransactionArrayArb = fc.array(validTransactionArb, { minLength: 1, maxLength: 20 })
  .map(arr => {
    const seen = new Set();
    return arr.filter(tx => { if (seen.has(tx.id)) return false; seen.add(tx.id); return true; });
  })
  .filter(arr => arr.length >= 1);

// ─── Property 1: Valid transactions always pass validateForm ─────────────────
// Validates: Requirements 1.3, 1.5, 2.3

test('Property 1 — valid transactions are always added (validateForm returns all nulls)', () => {
  fc.assert(
    fc.property(validNameArb, validAmountArb, validCategoryArb, (name, amount, category) => {
      const errors = validateForm(name, amount, category);
      assert.strictEqual(errors.name,     null, `name error for "${name}"`);
      assert.strictEqual(errors.amount,   null, `amount error for ${amount}`);
      assert.strictEqual(errors.category, null, `category error for "${category}"`);
    }),
    { numRuns: 200, verbose: true }
  );
});

// ─── Property 2: Invalid inputs always rejected ───────────────────────────────
// Validates: Requirements 1.3, 1.4

test('Property 2a — whitespace-only name is always rejected', () => {
  // Names that are empty or whitespace-only
  const badNameArb = fc.oneof(
    fc.constant(''),
    fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 50 })
  );
  fc.assert(
    fc.property(badNameArb, validAmountArb, validCategoryArb, (name, amount, category) => {
      const errors = validateForm(name, amount, category);
      assert.notStrictEqual(errors.name, null, `expected name error for "${name}"`);
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 2b — name over 100 characters is always rejected', () => {
  const longNameArb = fc.stringOf(fc.ascii(), { minLength: 101, maxLength: 200 })
    .filter(s => s.trim().length > 100);
  fc.assert(
    fc.property(longNameArb, validAmountArb, validCategoryArb, (name, amount, category) => {
      const errors = validateForm(name, amount, category);
      assert.notStrictEqual(errors.name, null, `expected name error for name of length ${name.length}`);
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 2c — amount below minimum (< 0.01) is always rejected', () => {
  const tooSmallArb = fc.oneof(
    fc.constant(0),
    fc.constant(-1),
    fc.double({ min: -1e9, max: 0.009, noNaN: true, noDefaultInfinity: true })
      .map(n => Math.round(n * 100) / 100)
      .filter(n => n < 0.01)
  );
  fc.assert(
    fc.property(tooSmallArb, validNameArb, validCategoryArb, (amount, name, category) => {
      const errors = validateForm(name, amount, category);
      assert.notStrictEqual(errors.amount, null, `expected amount error for ${amount}`);
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 2d — amount above maximum (> 999,999,999.99) is always rejected', () => {
  const tooBigArb = fc.double({ min: 1000000000, max: 1e15, noNaN: true, noDefaultInfinity: true })
    .map(n => Math.round(n * 100) / 100)
    .filter(n => n > 999999999.99);
  fc.assert(
    fc.property(tooBigArb, validNameArb, validCategoryArb, (amount, name, category) => {
      const errors = validateForm(name, amount, category);
      assert.notStrictEqual(errors.amount, null, `expected amount error for ${amount}`);
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 2e — non-numeric string amount is always rejected', () => {
  const nonNumericArb = fc.string({ minLength: 1, maxLength: 30 })
    .filter(s => s.trim() !== '' && !/^-?\d+(\.\d+)?$/.test(s.trim()));
  fc.assert(
    fc.property(nonNumericArb, validNameArb, validCategoryArb, (amount, name, category) => {
      const errors = validateForm(name, amount, category);
      assert.notStrictEqual(errors.amount, null, `expected amount error for "${amount}"`);
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 2f — invalid category is always rejected', () => {
  const invalidCatArb = fc.string({ minLength: 0, maxLength: 20 })
    .filter(s => !CATEGORIES.includes(s));
  fc.assert(
    fc.property(invalidCatArb, validNameArb, validAmountArb, (category, name, amount) => {
      const errors = validateForm(name, amount, category);
      assert.notStrictEqual(errors.category, null, `expected category error for "${category}"`);
    }),
    { numRuns: 200, verbose: true }
  );
});

// ─── Property 3: Balance equals sum of all transaction amounts ───────────────
// Validates: Requirements 4.2, 4.5

test('Property 3 — balance equals sum of all transaction amounts', () => {
  fc.assert(
    fc.property(validTransactionArrayArb, (txArray) => {
      const balance = computeBalance(txArray);
      // Manual sum for comparison
      let expected = 0;
      for (const tx of txArray) expected += tx.amount;
      // Allow tiny floating-point tolerance (1e-9)
      assert.ok(
        Math.abs(balance - expected) < 1e-9,
        `balance ${balance} !== expected sum ${expected}`
      );
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 3b — empty collection balance is 0', () => {
  const balance = computeBalance([]);
  assert.strictEqual(balance, 0);
  assert.strictEqual(formatCurrency(balance), '$0.00');
});

// ─── Property 4: Deleting a transaction removes it and reduces balance ────────
// Validates: Requirements 3.2, 3.3, 3.5

test('Property 4 — deleting a transaction removes it and reduces balance', () => {
  fc.assert(
    fc.property(
      nonEmptyTransactionArrayArb,
      fc.nat().map(n => n), // will be used as index
      (txArray, rawIndex) => {
        const index = rawIndex % txArray.length;
        const toDelete = txArray[index];
        const balanceBefore = computeBalance(txArray);

        // Simulate deletion: filter out by id
        const after = txArray.filter(tx => tx.id !== toDelete.id);

        // (a) Transaction is no longer present
        assert.ok(
          !after.some(tx => tx.id === toDelete.id),
          `deleted transaction id ${toDelete.id} still present`
        );

        // (b) Balance decreased by exactly the deleted transaction's amount
        // Use 1e-6 tolerance to accommodate IEEE 754 floating-point accumulation errors
        // that arise when large values (e.g. 16777215.99) are summed with small ones.
        const balanceAfter = computeBalance(after);
        assert.ok(
          Math.abs((balanceBefore - balanceAfter) - toDelete.amount) < 1e-6,
          `balance delta ${balanceBefore - balanceAfter} !== deleted amount ${toDelete.amount}`
        );

        // (c) Length reduced by 1 (assumes unique ids — guaranteed by uuid arbitrary)
        assert.strictEqual(
          after.length,
          txArray.length - 1,
          'list length should decrease by 1 after deletion'
        );
      }
    ),
    { numRuns: 200, verbose: true }
  );
});

// ─── Property 5: LocalStorage round-trip preserves transactions ───────────────
// Validates: Requirements 6.1, 6.2, 6.3

test('Property 5 — LocalStorage round-trip preserves transactions', () => {
  fc.assert(
    fc.property(validTransactionArrayArb, (original) => {
      // Simulate save then load
      const serialized = JSON.stringify(original);
      const { transactions: restored, error } = simulateLoad(serialized);

      assert.strictEqual(error, false, 'load should not error on valid data');
      assert.strictEqual(restored.length, original.length, 'length should match after round-trip');

      for (let i = 0; i < original.length; i++) {
        assert.strictEqual(restored[i].id,        original[i].id,        `id mismatch at index ${i}`);
        assert.strictEqual(restored[i].name,      original[i].name,      `name mismatch at index ${i}`);
        assert.strictEqual(restored[i].amount,    original[i].amount,    `amount mismatch at index ${i}`);
        assert.strictEqual(restored[i].category,  original[i].category,  `category mismatch at index ${i}`);
        assert.strictEqual(restored[i].createdAt, original[i].createdAt, `createdAt mismatch at index ${i}`);
      }
    }),
    { numRuns: 200, verbose: true }
  );
});

// ─── Property 6: Chart slice proportions reflect category totals ──────────────
// Validates: Requirements 5.1, 5.6

test('Property 6 — chart aggregation sums match transaction amounts per category', () => {
  fc.assert(
    fc.property(nonEmptyTransactionArrayArb, (txArray) => {
      const totals = computeCategoryTotals(txArray);
      const grandTotal = totals.Food + totals.Transport + totals.Fun;

      // Category totals must sum to the same value as the overall balance.
      // Use 1e-6 tolerance: two independent summation paths over the same values
      // can diverge by more than 1e-9 when large magnitudes (e.g. 67108864) are
      // mixed with small ones (e.g. 0.01), due to IEEE 754 rounding.
      const balance = computeBalance(txArray);
      assert.ok(
        Math.abs(grandTotal - balance) < 1e-6,
        `category totals ${grandTotal} !== balance ${balance}`
      );

      // Each category total is non-negative
      for (const cat of CATEGORIES) {
        assert.ok(totals[cat] >= 0, `negative total for ${cat}: ${totals[cat]}`);
      }

      // Categories with zero total are excluded from active slices
      const activeCategories = CATEGORIES.filter(cat => totals[cat] > 0);
      for (const cat of CATEGORIES) {
        if (totals[cat] === 0) {
          assert.ok(!activeCategories.includes(cat), `zero-total category ${cat} should be excluded`);
        } else {
          assert.ok(activeCategories.includes(cat), `non-zero category ${cat} should be included`);
        }
      }

      // Proportions across active categories sum to 1 (within tolerance)
      if (activeCategories.length > 0 && grandTotal > 0) {
        const proportionSum = activeCategories.reduce((s, cat) => s + totals[cat] / grandTotal, 0);
        assert.ok(
          Math.abs(proportionSum - 1) < 1e-9,
          `proportions sum ${proportionSum} !== 1`
        );
      }
    }),
    { numRuns: 200, verbose: true }
  );
});

// ─── Property 7: Malformed LocalStorage data produces empty state ─────────────
// Validates: Requirements 6.4, 6.5

test('Property 7a — malformed JSON produces empty state and error', () => {
  const malformedJsonArb = fc.string({ minLength: 1, maxLength: 100 })
    .filter(s => {
      try { JSON.parse(s); return false; } catch (_) { return true; }
    });

  fc.assert(
    fc.property(malformedJsonArb, (raw) => {
      const { transactions, error } = simulateLoad(raw);
      assert.deepStrictEqual(transactions, [], `expected [] for malformed JSON "${raw}"`);
      assert.strictEqual(error, true, 'expected error flag for malformed JSON');
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 7b — valid JSON that is not an array produces empty state and error', () => {
  // Objects, numbers, strings, booleans, null
  const nonArrayJsonArb = fc.oneof(
    fc.record({ foo: fc.string() }),
    fc.integer(),
    fc.string(),
    fc.boolean(),
    fc.constant(null)
  ).map(v => JSON.stringify(v));

  fc.assert(
    fc.property(nonArrayJsonArb, (raw) => {
      if (raw === 'null') return; // JSON.parse('null') === null, which is not an array → error path
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return; // skip (edge case: fc.string might generate "[]")
      const { transactions, error } = simulateLoad(raw);
      assert.deepStrictEqual(transactions, [], 'expected [] for non-array JSON');
      assert.strictEqual(error, true, 'expected error flag for non-array JSON');
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 7c — JSON array with at least one invalid transaction shape produces empty state', () => {
  // Build arrays that contain at least one item violating the schema
  const invalidItemArb = fc.oneof(
    fc.record({ id: fc.string(), name: fc.constant(''), amount: fc.double({ noNaN: true, noDefaultInfinity: true }), category: fc.constant('Food'), createdAt: fc.integer() }), // empty name
    fc.record({ id: fc.string(), name: fc.string({ minLength: 1 }), amount: fc.constant('not-a-number'), category: fc.constant('Food'), createdAt: fc.integer() }), // amount is string
    fc.record({ id: fc.string(), name: fc.string({ minLength: 1 }), amount: fc.double({ noNaN: true, noDefaultInfinity: true }), category: fc.constant('BadCat'), createdAt: fc.integer() }), // bad category
    fc.record({ id: fc.constant(''), name: fc.string({ minLength: 1 }), amount: fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }), category: fc.constant('Fun'), createdAt: fc.integer() }),  // empty id
  );

  fc.assert(
    fc.property(invalidItemArb, (badItem) => {
      // Array with just the bad item
      const raw = JSON.stringify([badItem]);
      const { transactions, error } = simulateLoad(raw);
      assert.deepStrictEqual(transactions, [], `expected [] for array with invalid item`);
      assert.strictEqual(error, true, 'expected error flag for invalid transaction shape');
    }),
    { numRuns: 200, verbose: true }
  );
});

test('Property 7d — null from localStorage (no prior data) produces empty state without error', () => {
  const { transactions, error } = simulateLoad(null);
  assert.deepStrictEqual(transactions, []);
  assert.strictEqual(error, false, 'null (no data) should not trigger an error');
});

// ─── Static verification tests (non-PBT) ─────────────────────────────────────

test('Static: formatCurrency formats known values correctly', () => {
  assert.strictEqual(formatCurrency(0),          '$0.00');
  assert.strictEqual(formatCurrency(12.5),        '$12.50');
  assert.strictEqual(formatCurrency(1234567.89),  '$1,234,567.89');
  assert.strictEqual(formatCurrency(0.01),        '$0.01');
  assert.strictEqual(formatCurrency(999999999.99),'$999,999,999.99');
});

test('Static: isValidTransactionShape accepts well-formed transactions', () => {
  const good = { id: 'abc', name: 'Lunch', amount: 12.50, category: 'Food', createdAt: 1700000000000 };
  assert.strictEqual(isValidTransactionShape(good), true);
});

test('Static: isValidTransactionShape rejects missing fields', () => {
  assert.strictEqual(isValidTransactionShape(null),                          false);
  assert.strictEqual(isValidTransactionShape({}),                            false);
  assert.strictEqual(isValidTransactionShape({ id: '', name: 'x', amount: 1, category: 'Food', createdAt: 1 }), false); // empty id
  assert.strictEqual(isValidTransactionShape({ id: 'x', name: '', amount: 1, category: 'Food', createdAt: 1 }), false); // empty name
  assert.strictEqual(isValidTransactionShape({ id: 'x', name: 'x', amount: NaN, category: 'Food', createdAt: 1 }), false); // NaN amount
  assert.strictEqual(isValidTransactionShape({ id: 'x', name: 'x', amount: 1, category: 'Other', createdAt: 1 }), false); // bad category
});

test('Static: validateForm boundary amounts', () => {
  // Exactly at boundaries — should be valid
  assert.deepStrictEqual(validateForm('Lunch', 0.01, 'Food'),          { name: null, amount: null, category: null });
  assert.deepStrictEqual(validateForm('Lunch', 999999999.99, 'Food'),  { name: null, amount: null, category: null });

  // Just outside boundaries — should produce error
  const tooLow  = validateForm('Lunch', 0,          'Food');
  const tooHigh = validateForm('Lunch', 1000000000, 'Food');
  assert.notStrictEqual(tooLow.amount,  null, 'amount 0 should fail');
  assert.notStrictEqual(tooHigh.amount, null, 'amount 1,000,000,000 should fail');
});
