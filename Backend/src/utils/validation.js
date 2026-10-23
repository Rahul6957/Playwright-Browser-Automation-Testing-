const { createError } = require("./errors");

function parsePositiveId(value, label = "ID") {
    const text = String(value);
    if (!/^[1-9]\d*$/.test(text)) {
        throw createError(`Invalid ${label}`, 400);
    }
    const parsed = Number(text);
    if (!Number.isSafeInteger(parsed)) {
        throw createError(`Invalid ${label}`, 400);
    }
    return parsed;
}

function parsePositiveQuantity(value) {
    if (!/^[1-9]\d*$/.test(String(value))) {
        throw createError("Quantity must be a positive integer", 400);
    }
    const quantity = Number(value);
    if (!Number.isSafeInteger(quantity) || quantity > 2147483647) {
        throw createError("Quantity must be a positive integer", 400);
    }
    return quantity;
}

function parsePrice(value) {
    if (
        (typeof value !== "number" && typeof value !== "string") ||
        !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(String(value))
    ) {
        throw createError("Price must be a non-negative amount with at most two decimal places", 400);
    }
    return Number(value).toFixed(2);
}

function parseNonNegativeStock(value) {
    if (!/^(?:0|[1-9]\d*)$/.test(String(value))) {
        throw createError("Stock must be a non-negative integer", 400);
    }
    const stock = Number(value);
    if (!Number.isSafeInteger(stock) || stock > 2147483647) {
        throw createError("Stock must be a non-negative integer", 400);
    }
    return stock;
}

module.exports = {
    parsePositiveId,
    parsePositiveQuantity,
    parsePrice,
    parseNonNegativeStock
};
