const pool = require("../config/db");

class CartRepository {
    async getCart(userId) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [carts] = await connection.execute(
                "SELECT cart_id FROM carts WHERE user_id = ? LIMIT 1",
                [userId]
            );
            if (!carts.length) {
                await connection.commit();
                transactionStarted = false;
                return { cart_id: null, items: [], total: "0.00" };
            }

            const cartId = carts[0].cart_id;
            const [items] = await connection.execute(
                `SELECT ci.book_id, b.title, b.author, b.image_url, ci.quantity,
                        CAST(b.price AS DECIMAL(10, 2)) AS unit_price,
                        CAST(b.price * ci.quantity AS DECIMAL(20, 2)) AS subtotal
                 FROM cart_items ci
                 JOIN books b ON b.book_id = ci.book_id
                 WHERE ci.cart_id = ?
                 ORDER BY ci.cart_item_id`,
                [cartId]
            );
            const [totals] = await connection.execute(
                `SELECT CAST(COALESCE(SUM(b.price * ci.quantity), 0) AS DECIMAL(30, 2)) AS total
                 FROM cart_items ci
                 JOIN books b ON b.book_id = ci.book_id
                 WHERE ci.cart_id = ?`,
                [cartId]
            );
            await connection.commit();
            transactionStarted = false;
            return { cart_id: cartId, items, total: totals[0].total };
        } catch (error) {
            if (transactionStarted) {
                await connection.rollback();
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async getOrCreateCart(connection, userId) {
        const [result] = await connection.execute(
            `INSERT INTO carts (user_id) VALUES (?)
             ON DUPLICATE KEY UPDATE cart_id = LAST_INSERT_ID(cart_id)`,
            [userId]
        );
        const cartId = result.insertId;
        await connection.execute(
            "SELECT cart_id FROM carts WHERE cart_id = ? FOR UPDATE",
            [cartId]
        );
        return cartId;
    }

    async lockBook(connection, bookId) {
        const [books] = await connection.execute(
            `SELECT book_id, title, price, stock, is_active
             FROM books WHERE book_id = ? FOR UPDATE`,
            [bookId]
        );
        return books[0] || null;
    }

    async getCartItem(connection, cartId, bookId) {
        const [items] = await connection.execute(
            `SELECT cart_item_id, quantity FROM cart_items
             WHERE cart_id = ? AND book_id = ? FOR UPDATE`,
            [cartId, bookId]
        );
        return items[0] || null;
    }

    async addItem(userId, bookId, quantity) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const cartId = await this.getOrCreateCart(connection, userId);
            const book = await this.lockBook(connection, bookId);
            if (!book || !book.is_active) {
                const error = new Error("Active book not found");
                error.statusCode = 404;
                throw error;
            }
            const item = await this.getCartItem(connection, cartId, bookId);
            const newQuantity = (item ? item.quantity : 0) + quantity;
            if (newQuantity > book.stock) {
                const error = new Error("Requested quantity exceeds available stock");
                error.statusCode = 409;
                throw error;
            }
            if (item) {
                await connection.execute(
                    "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?",
                    [newQuantity, item.cart_item_id]
                );
            } else {
                await connection.execute(
                    "INSERT INTO cart_items (cart_id, book_id, quantity) VALUES (?, ?, ?)",
                    [cartId, bookId, quantity]
                );
            }
            await connection.commit();
            transactionStarted = false;
            return this.getCart(userId);
        } catch (error) {
            if (transactionStarted) {
                await connection.rollback();
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateItem(userId, bookId, quantity) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [carts] = await connection.execute(
                "SELECT cart_id FROM carts WHERE user_id = ? FOR UPDATE",
                [userId]
            );
            if (!carts.length) {
                const error = new Error("Cart item not found");
                error.statusCode = 404;
                throw error;
            }
            const cartId = carts[0].cart_id;
            const book = await this.lockBook(connection, bookId);
            const item = await this.getCartItem(connection, cartId, bookId);
            if (!book || !book.is_active || !item) {
                const error = new Error("Cart item not found");
                error.statusCode = 404;
                throw error;
            }
            if (quantity > book.stock) {
                const error = new Error("Requested quantity exceeds available stock");
                error.statusCode = 409;
                throw error;
            }
            await connection.execute(
                "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?",
                [quantity, item.cart_item_id]
            );
            await connection.commit();
            transactionStarted = false;
            return this.getCart(userId);
        } catch (error) {
            if (transactionStarted) {
                await connection.rollback();
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async deleteItem(userId, bookId) {
        const [result] = await pool.execute(
            `DELETE ci FROM cart_items ci
             JOIN carts c ON c.cart_id = ci.cart_id
             WHERE c.user_id = ? AND ci.book_id = ?`,
            [userId, bookId]
        );
        return result.affectedRows > 0;
    }

    async clearCart(userId) {
        const [result] = await pool.execute(
            `DELETE ci FROM cart_items ci
             JOIN carts c ON c.cart_id = ci.cart_id
             WHERE c.user_id = ?`,
            [userId]
        );
        return result.affectedRows;
    }
}

module.exports = new CartRepository();
