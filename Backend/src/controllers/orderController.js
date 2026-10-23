const orderService = require("../services/orderService");
const { handleControllerError } = require("../utils/errors");

class OrderController {
    async checkoutPreview(req, res) {
        try {
            return res.status(200).json({
                success: true,
                data: { expected_delivery_date: await orderService.deliveryEstimate() }
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to estimate delivery date");
        }
    }

    async createOrder(req, res) {
        try {
            const result = await orderService.createOrder(req.user.user_id, req.body || {});
            return res.status(201).json({
                success: true,
                message: req.body?.payment_method === "ONLINE"
                    ? "Online order created"
                    : "Order created successfully",
                data: result
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to create order");
        }
    }

    async createPayment(req, res) {
        try {
            return res.status(201).json({
                success: true,
                data: await orderService.createPayment(req.user, req.params.id)
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to initialize payment");
        }
    }

    async verifyPayment(req, res) {
        try {
            return res.status(200).json({
                success: true,
                data: await orderService.verifyPayment(req.user, req.body || {})
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to verify payment");
        }
    }

    async listOrders(req, res) {
        try {
            const orders = await orderService.listOrders(req.user);
            return res.status(200).json({
                success: true,
                count: orders.length,
                data: orders
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch orders");
        }
    }

    async getOrder(req, res) {
        try {
            return res.status(200).json({
                success: true,
                data: await orderService.getOrder(req.user, req.params.id)
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch order");
        }
    }

    async cancelOrder(req, res) {
        try {
            return res.status(200).json({
                success: true,
                message: "Order cancelled successfully",
                data: await orderService.cancelOrder(req.user, req.params.id)
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to cancel order");
        }
    }

    async getItems(req, res) {
        try {
            const items = await orderService.getItems(req.user, req.params.id);
            return res.status(200).json({
                success: true,
                count: items.length,
                data: items
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch order items");
        }
    }
}

module.exports = new OrderController();
