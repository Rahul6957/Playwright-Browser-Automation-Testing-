const paymentRepository = require("../repositories/paymentRepository");
const razorpay = require("./razorpayGateway");
const { createError } = require("../utils/errors");
const { toCents } = require("../utils/money");

class PaymentService {
    configuration() {
        return razorpay.publicConfiguration();
    }

    async createForOrder(orderId, userId) {
        if (!razorpay.isConfigured()) {
            throw createError("Online payments are not configured. Set Razorpay Test Mode credentials on the backend.", 503);
        }
        const attempt = await paymentRepository.reserveAttempt(orderId, userId);
        if (attempt.reused) {
            return this.publicAttempt(attempt);
        }

        const amount = Number(toCents(attempt.amount));
        try {
            const gatewayOrder = await razorpay.createOrder({
                amount,
                currency: "INR",
                receipt: `BH-${orderId}-${attempt.payment_attempt_id}`,
                notes: { bookhub_order_id: String(orderId) }
            });
            const saved = await paymentRepository.completeAttempt(
                attempt.payment_attempt_id,
                gatewayOrder.id
            );
            return {
                key_id: razorpay.publicConfiguration().key_id,
                gateway_order_id: saved.gateway_order_id,
                amount,
                currency: "INR",
                order_id: orderId
            };
        } catch (error) {
            await paymentRepository.failAttempt(
                attempt.payment_attempt_id,
                error.message || "Razorpay order creation failed"
            );
            throw createError(
                "Your order was created, but Razorpay could not start payment. Open the order details to retry.",
                502
            );
        }
    }

    publicAttempt(attempt) {
        return {
            key_id: razorpay.publicConfiguration().key_id,
            gateway_order_id: attempt.gateway_order_id,
            amount: Number(toCents(attempt.amount)),
            currency: "INR",
            order_id: attempt.order_id
        };
    }

    async verifyCheckout(userId, input = {}) {
        const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = input;
        if ([orderId, paymentId, signature].some((value) =>
            typeof value !== "string" || value.length < 1 || value.length > 200
        )) {
            throw createError("Razorpay payment verification details are invalid", 400);
        }
        const attempt = await paymentRepository.findAttempt(orderId, userId);
        if (!attempt) throw createError("Payment attempt not found", 404);
        if (!razorpay.verifyCheckoutSignature(orderId, paymentId, signature)) {
            throw createError("Razorpay payment signature is invalid", 400);
        }

        let payment = await razorpay.fetchPayment(paymentId);
        if (payment.order_id !== orderId ||
            Number(payment.amount) !== Number(toCents(attempt.amount)) ||
            payment.currency !== "INR") {
            throw createError("Payment details do not match this order", 409);
        }
        if (payment.status === "authorized") {
            payment = await razorpay.capturePayment(paymentId, Number(toCents(attempt.amount)));
        }
        if (payment.status !== "captured" || payment.captured !== true) {
            throw createError("Razorpay has not confirmed a captured payment yet", 409);
        }

        const result = await paymentRepository.confirmPayment(attempt, payment, true);
        if (result.refund_required) {
            await this.processRefund(attempt.order_id, payment.id);
        }
        return result;
    }

    async handleWebhook(event) {
        const entity = event?.payload?.payment?.entity;
        if (event?.event === "payment.captured" && entity) {
            const attempt = await paymentRepository.findAttemptByGatewayOrderId(entity.order_id);
            if (!attempt || Number(entity.amount) !== Number(toCents(attempt.amount)) ||
                entity.currency !== "INR" || entity.status !== "captured") {
                throw createError("Captured payment does not match a BookHub payment attempt", 400);
            }
            const result = await paymentRepository.confirmPayment(attempt, entity, true);
            if (result.refund_required) {
                await this.processRefund(attempt.order_id, entity.id);
            }
            return;
        }
        if (event?.event === "payment.failed" && entity) {
            await paymentRepository.markPaymentFailed(
                entity.order_id,
                entity.id,
                entity.error_description || entity.error_reason
            );
            return;
        }
        const refund = event?.payload?.refund?.entity;
        if ((event?.event === "refund.processed" || event?.event === "refund.failed") && refund) {
            await paymentRepository.updateRefundFromWebhook(
                refund.id,
                refund.payment_id,
                event.event === "refund.processed" ? "PROCESSED" : "FAILED"
            );
        }
    }

    async processRefund(orderId, paymentId) {
        if (!razorpay.isConfigured()) {
            console.warn(`Razorpay credentials are unavailable; refund for order ${orderId} remains pending.`);
            return;
        }
        const refund = await paymentRepository.claimRefund(orderId, paymentId);
        if (!refund) return;
        try {
            const response = await razorpay.createRefund(paymentId, {
                amount: Number(toCents(refund.amount)),
                speed: "normal",
                receipt: `BH-RF-${refund.refund_record_id}`,
                notes: { bookhub_order_id: String(orderId) }
            });
            await paymentRepository.saveRefundResult(orderId, paymentId, response);
        } catch (error) {
            console.error(`Razorpay refund request for order ${orderId} needs reconciliation:`, error.message);
            try {
                const result = await razorpay.fetchRefunds(paymentId);
                const receipt = `BH-RF-${refund.refund_record_id}`;
                const existing = (result.items || []).find((item) => item.receipt === receipt);
                if (existing) {
                    await paymentRepository.saveRefundResult(orderId, paymentId, existing);
                }
            } catch (reconciliationError) {
                console.error(`Razorpay refund lookup for order ${orderId} failed:`, reconciliationError.message);
            }
        }
    }
}

module.exports = new PaymentService();
