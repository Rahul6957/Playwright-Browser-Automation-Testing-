const cartService = require("../services/cartService");
const { handleControllerError } = require("../utils/errors");

class CartController {
    async getCart(req, res) {
        try {
            return res.status(200).json({
                success: true,
                data: await cartService.getCart(req.user.user_id)
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch cart");
        }
    }

    async addItem(req, res) {
        try {
            const cart = await cartService.addItem(req.user.user_id, req.body || {});
            return res.status(200).json({
                success: true,
                message: "Cart updated successfully",
                data: cart
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to update cart");
        }
    }

    async updateItem(req, res) {
        try {
            const cart = await cartService.updateItem(
                req.user.user_id,
                req.params.bookId,
                req.body || {}
            );
            return res.status(200).json({
                success: true,
                message: "Cart item updated successfully",
                data: cart
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to update cart item");
        }
    }

    async deleteItem(req, res) {
        try {
            const cart = await cartService.deleteItem(req.user.user_id, req.params.bookId);
            return res.status(200).json({
                success: true,
                message: "Cart item removed successfully",
                data: cart
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to remove cart item");
        }
    }

    async clearCart(req, res) {
        try {
            const cart = await cartService.clearCart(req.user.user_id);
            return res.status(200).json({
                success: true,
                message: "Cart cleared successfully",
                data: cart
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to clear cart");
        }
    }
}

module.exports = new CartController();
