const crypto = require("crypto");
const Razorpay = require("razorpay");
const { createError } = require("../utils/errors");

let instance;

function getCredentials() {
    return {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    };
}

function isConfigured() {
    const { keyId, keySecret } = getCredentials();
    return Boolean(keyId && keySecret);
}

function publicConfiguration() {
    const { keyId } = getCredentials();
    return { configured: isConfigured(), key_id: keyId || null };
}

function client() {
    const { keyId, keySecret } = getCredentials();
    if (!keyId || !keySecret) {
        throw createError("Online payments are not configured. Set Razorpay Test Mode credentials on the backend.", 503);
    }
    if (!instance || instance.key_id !== keyId || instance.key_secret !== keySecret) {
        instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return instance;
}

function matchesSignature(secret, message, signature) {
    if (!secret || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
        return false;
    }
    const expected = crypto.createHmac("sha256", secret).update(message).digest();
    const received = Buffer.from(signature, "hex");
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function verifyCheckoutSignature(gatewayOrderId, paymentId, signature) {
    const { keySecret } = getCredentials();
    return matchesSignature(keySecret, `${gatewayOrderId}|${paymentId}`, signature);
}

function verifyWebhookSignature(rawBody, signature) {
    const { webhookSecret } = getCredentials();
    return Buffer.isBuffer(rawBody) &&
        matchesSignature(webhookSecret, rawBody, signature);
}

module.exports = {
    isConfigured,
    publicConfiguration,
    createOrder: (input) => client().orders.create(input),
    fetchPayment: (id) => client().payments.fetch(id),
    capturePayment: (id, amount) => client().payments.capture(id, amount, "INR"),
    createRefund: (paymentId, input) => client().payments.refund(paymentId, input),
    fetchRefunds: (paymentId) => client().payments.fetchMultipleRefund(paymentId, { count: 10 }),
    verifyCheckoutSignature,
    verifyWebhookSignature
};
