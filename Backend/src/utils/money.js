function toCents(value) {
    const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if (!match) {
        throw new Error("Database returned an invalid monetary amount");
    }
    return BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0") || "0");
}

function fromCents(cents) {
    return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

module.exports = { toCents, fromCents };
