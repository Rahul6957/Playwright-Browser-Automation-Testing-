const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const paymentRepository = require("../src/repositories/paymentRepository");
const razorpay = require("../src/services/razorpayGateway");
const paymentService = require("../src/services/paymentService");

test("Razorpay checkout signatures are checked using the server secret", () => {
    process.env.RAZORPAY_KEY_SECRET = "razorpay-test-secret";
    const message = "order_test123|pay_test456";
    const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(message)
        .digest("hex");

    assert.equal(razorpay.verifyCheckoutSignature("order_test123", "pay_test456", signature), true);
    assert.equal(razorpay.verifyCheckoutSignature("order_test123", "pay_test456", "0".repeat(64)), false);
    assert.equal(razorpay.verifyCheckoutSignature("order_test123", "pay_test456", "invalid"), false);
});

test("Razorpay webhooks require the configured webhook signature", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-test-secret";
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

    assert.equal(razorpay.verifyWebhookSignature(rawBody, signature), true);
    assert.equal(razorpay.verifyWebhookSignature(rawBody, "f".repeat(64)), false);
    assert.equal(razorpay.verifyWebhookSignature("not raw bytes", signature), false);
});

test("verified authorized payments are captured before confirming the order", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "razorpay-test-secret";
    const originals = {
        findAttempt: paymentRepository.findAttempt,
        confirmPayment: paymentRepository.confirmPayment,
        verifyCheckoutSignature: razorpay.verifyCheckoutSignature,
        fetchPayment: razorpay.fetchPayment,
        capturePayment: razorpay.capturePayment
    };
    const attempt = {
        payment_attempt_id: 7,
        order_id: 12,
        gateway_order_id: "order_test123",
        amount: "25.00",
        status: "CREATED"
    };
    let captured = false;
    let confirmed = false;
    paymentRepository.findAttempt = async () => attempt;
    paymentRepository.confirmPayment = async (savedAttempt, payment, signatureVerified) => {
        assert.equal(savedAttempt, attempt);
        assert.equal(payment.status, "captured");
        assert.equal(signatureVerified, true);
        confirmed = true;
        return { duplicate: false, refund_required: false };
    };
    razorpay.verifyCheckoutSignature = () => true;
    razorpay.fetchPayment = async () => ({
        id: "pay_test456",
        order_id: "order_test123",
        amount: 2500,
        currency: "INR",
        status: "authorized"
    });
    razorpay.capturePayment = async (paymentId, amount) => {
        assert.equal(paymentId, "pay_test456");
        assert.equal(amount, 2500);
        captured = true;
        return {
            id: paymentId,
            order_id: "order_test123",
            amount,
            currency: "INR",
            status: "captured",
            captured: true
        };
    };

    try {
        const result = await paymentService.verifyCheckout(3, {
            razorpay_order_id: "order_test123",
            razorpay_payment_id: "pay_test456",
            razorpay_signature: "a".repeat(64)
        });
        assert.deepEqual(result, { duplicate: false, refund_required: false });
        assert.equal(captured, true);
        assert.equal(confirmed, true);
    } finally {
        paymentRepository.findAttempt = originals.findAttempt;
        paymentRepository.confirmPayment = originals.confirmPayment;
        razorpay.verifyCheckoutSignature = originals.verifyCheckoutSignature;
        razorpay.fetchPayment = originals.fetchPayment;
        razorpay.capturePayment = originals.capturePayment;
    }
});

test("a bad checkout signature cannot fetch or confirm a payment", async () => {
    const originals = {
        findAttempt: paymentRepository.findAttempt,
        verifyCheckoutSignature: razorpay.verifyCheckoutSignature,
        fetchPayment: razorpay.fetchPayment
    };
    paymentRepository.findAttempt = async () => ({
        payment_attempt_id: 9,
        order_id: 17,
        gateway_order_id: "order_test_bad",
        amount: "19.00",
        status: "CREATED"
    });
    razorpay.verifyCheckoutSignature = () => false;
    razorpay.fetchPayment = async () => {
        throw new Error("Gateway fetch must not occur for an invalid signature");
    };

    try {
        await assert.rejects(
            paymentService.verifyCheckout(3, {
                razorpay_order_id: "order_test_bad",
                razorpay_payment_id: "pay_test_bad",
                razorpay_signature: "b".repeat(64)
            }),
            { message: "Razorpay payment signature is invalid", statusCode: 400 }
        );
    } finally {
        paymentRepository.findAttempt = originals.findAttempt;
        razorpay.verifyCheckoutSignature = originals.verifyCheckoutSignature;
        razorpay.fetchPayment = originals.fetchPayment;
    }
});

test("a failed or uncaptured gateway payment cannot confirm an order", async () => {
    const originals = {
        findAttempt: paymentRepository.findAttempt,
        confirmPayment: paymentRepository.confirmPayment,
        verifyCheckoutSignature: razorpay.verifyCheckoutSignature,
        fetchPayment: razorpay.fetchPayment
    };
    paymentRepository.findAttempt = async () => ({
        payment_attempt_id: 11,
        order_id: 19,
        gateway_order_id: "order_test_failed",
        amount: "40.00",
        status: "CREATED"
    });
    let confirmed = false;
    paymentRepository.confirmPayment = async () => { confirmed = true; };
    razorpay.verifyCheckoutSignature = () => true;
    razorpay.fetchPayment = async () => ({
        id: "pay_test_failed",
        order_id: "order_test_failed",
        amount: 4000,
        currency: "INR",
        status: "failed",
        captured: false
    });

    try {
        await assert.rejects(
            paymentService.verifyCheckout(3, {
                razorpay_order_id: "order_test_failed",
                razorpay_payment_id: "pay_test_failed",
                razorpay_signature: "c".repeat(64)
            }),
            { message: "Razorpay has not confirmed a captured payment yet", statusCode: 409 }
        );
        assert.equal(confirmed, false);
    } finally {
        paymentRepository.findAttempt = originals.findAttempt;
        paymentRepository.confirmPayment = originals.confirmPayment;
        razorpay.verifyCheckoutSignature = originals.verifyCheckoutSignature;
        razorpay.fetchPayment = originals.fetchPayment;
    }
});
