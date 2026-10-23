const test = require("node:test");
const assert = require("node:assert/strict");
const {
    parsePositiveId,
    parsePositiveQuantity,
    parsePrice,
    parseNonNegativeStock
} = require("../src/utils/validation");
const { toCents, fromCents } = require("../src/utils/money");

test("IDs accept positive integers and reject malformed values", () => {
    assert.equal(parsePositiveId("12", "book ID"), 12);
    for (const value of ["0", "-1", "1.2", "1e2", "01", "x"]) {
        assert.throws(() => parsePositiveId(value));
    }
});

test("quantities and stock enforce integer ranges", () => {
    assert.equal(parsePositiveQuantity("2"), 2);
    assert.equal(parseNonNegativeStock(0), 0);
    for (const value of [0, "-1", "1.5", "1e2", "x"]) {
        assert.throws(() => parsePositiveQuantity(value));
    }
    for (const value of [-1, "1.2", "1e2", "x"]) {
        assert.throws(() => parseNonNegativeStock(value));
    }
});

test("prices enforce non-negative decimal amounts with two places", () => {
    assert.equal(parsePrice("12.5"), "12.50");
    assert.equal(parsePrice(0), "0.00");
    for (const value of [-1, "1.234", "1e3", "100000000", "x"]) {
        assert.throws(() => parsePrice(value));
    }
});

test("monetary helpers preserve decimal precision", () => {
    assert.equal(fromCents(toCents("100.09")), "100.09");
    assert.equal(fromCents(toCents("12")), "12.00");
});
