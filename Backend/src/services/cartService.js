const cartRepository = require("../repositories/cartRepository");
const { parsePositiveId, parsePositiveQuantity } = require("../utils/validation");

class CartService {
    getCart(userId) {
        return cartRepository.getCart(userId);
    }

    addItem(userId, input = {}) {
        const bookId = parsePositiveId(input.book_id, "book ID");
        const quantity = parsePositiveQuantity(input.quantity);
        return cartRepository.addItem(userId, bookId, quantity);
    }

    updateItem(userId, bookId, input = {}) {
        const id = parsePositiveId(bookId, "book ID");
        const quantity = parsePositiveQuantity(input.quantity);
        return cartRepository.updateItem(userId, id, quantity);
    }

    async deleteItem(userId, bookId) {
        const id = parsePositiveId(bookId, "book ID");
        if (!(await cartRepository.deleteItem(userId, id))) {
            const error = new Error("Cart item not found");
            error.statusCode = 404;
            throw error;
        }
        return cartRepository.getCart(userId);
    }

    async clearCart(userId) {
        await cartRepository.clearCart(userId);
        return cartRepository.getCart(userId);
    }
}

module.exports = new CartService();
