const orderRepository = require("../repositories/orderRepository");
const paymentService = require("./paymentService");
const { createError } = require("../utils/errors");
const { parsePositiveId } = require("../utils/validation");

class OrderService {
    async createOrder(userId, input = {}) {
        const address = input.delivery_address;
        if (typeof address !== "string" || !address.trim()) {
            throw createError("Delivery address is required", 400);
        }
        if (address.trim().length > 5000) {
            throw createError("Delivery address is too long", 400);
        }
        const paymentMethod = input.payment_method === undefined
            ? "COD"
            : String(input.payment_method).toUpperCase();
        if (!["COD", "ONLINE"].includes(paymentMethod)) {
            throw createError("Payment method must be COD or ONLINE", 400);
        }
        if (paymentMethod === "ONLINE" && !paymentService.configuration().configured) {
            throw createError("Online payments are not configured. Use COD or configure Razorpay Test Mode.", 503);
        }
        const order = await orderRepository.createFromCart(userId, address.trim(), paymentMethod);
        if (paymentMethod === "COD") return order;
        try {
            const payment = await paymentService.createForOrder(order.order_id, userId);
            return { order, payment, payment_setup_error: null };
        } catch (error) {
            if (error.statusCode !== 502) throw error;
            return { order, payment: null, payment_setup_error: error.message };
        }
    }

    listOrders(user) {
        return orderRepository.listOrders(user.user_id, user.role === "ADMIN");
    }

    deliveryEstimate() {
        return orderRepository.deliveryEstimate();
    }

    async getOrder(user, orderId) {
        const id = parsePositiveId(orderId, "order ID");
        const order = await orderRepository.findOrder(
            id,
            user.user_id,
            user.role === "ADMIN"
        );
        if (!order) {
            throw createError("Order not found", 404);
        }
        return order;
    }

    async getItems(user, orderId) {
        const id = parsePositiveId(orderId, "order ID");
        const order = await orderRepository.findOrder(
            id,
            user.user_id,
            user.role === "ADMIN"
        );
        if (!order) {
            throw createError("Order not found", 404);
        }
        return orderRepository.listItems(id, user.user_id, user.role === "ADMIN");
    }

    async cancelOrder(user, orderId) {
        const id = parsePositiveId(orderId, "order ID");
        const cancelled = await orderRepository.cancelOrder(
            id,
            user.user_id,
            user.role === "ADMIN"
        );
        if (cancelled.refund_status === "PENDING" && cancelled.gateway_payment_id) {
            await paymentService.processRefund(id, cancelled.gateway_payment_id);
        }
        return orderRepository.findOrder(id, user.user_id, user.role === "ADMIN");
    }

    createPayment(user, orderId) {
        return paymentService.createForOrder(
            parsePositiveId(orderId, "order ID"),
            user.user_id
        );
    }

    verifyPayment(user, input) {
        return paymentService.verifyCheckout(user.user_id, input);
    }
}

module.exports = new OrderService();
