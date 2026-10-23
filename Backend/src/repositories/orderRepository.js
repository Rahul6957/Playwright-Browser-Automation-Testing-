const crypto = require("crypto");
const pool = require("../config/db");
const { toCents, fromCents } = require("../utils/money");

class OrderRepository {
    async deliveryEstimate() {
        const [rows] = await pool.query(
            "SELECT DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), '%Y-%m-%d') AS expected_delivery_date"
        );
        return rows[0].expected_delivery_date;
    }

    async createFromCart(userId, deliveryAddress, paymentMethod = "COD") {
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
                const error = new Error("Cart is empty");
                error.statusCode = 400;
                throw error;
            }

            const cartId = carts[0].cart_id;
            const [items] = await connection.execute(
                `SELECT ci.book_id, ci.quantity, b.title, b.price, b.stock, b.is_active
                 FROM cart_items ci
                 JOIN books b ON b.book_id = ci.book_id
                 WHERE ci.cart_id = ?
                 ORDER BY ci.book_id
                 FOR UPDATE`,
                [cartId]
            );
            if (!items.length) {
                const error = new Error("Cart is empty");
                error.statusCode = 400;
                throw error;
            }

            let totalCents = 0n;
            const prices = [];
            for (const item of items) {
                if (!item.is_active) {
                    const error = new Error(`Book ${item.book_id} is no longer available`);
                    error.statusCode = 409;
                    throw error;
                }
                if (item.quantity > item.stock) {
                    const error = new Error(`Insufficient stock for book ${item.book_id}`);
                    error.statusCode = 409;
                    throw error;
                }
                const cents = toCents(item.price);
                totalCents += cents * BigInt(item.quantity);
                prices.push(cents.toString());
            }
            if (totalCents > 9999999999n) {
                const error = new Error("Order total exceeds the supported amount");
                error.statusCode = 400;
                throw error;
            }
            const totalAmount = fromCents(totalCents);

            const [orderResult] = await connection.execute(
                `INSERT INTO orders
                    (user_id, order_date, expected_delivery_date, total_amount,
                     delivery_address, order_status)
                 VALUES (?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), ?, ?, 'PENDING')`,
                [userId, totalAmount, deliveryAddress]
            );
            const orderId = orderResult.insertId;
            for (let index = 0; index < items.length; index += 1) {
                const item = items[index];
                const [stockResult] = await connection.execute(
                    `UPDATE books SET stock = stock - ?
                     WHERE book_id = ? AND is_active = TRUE AND stock >= ?`,
                    [item.quantity, item.book_id, item.quantity]
                );
                if (stockResult.affectedRows !== 1) {
                    const error = new Error(`Insufficient stock for book ${item.book_id}`);
                    error.statusCode = 409;
                    throw error;
                }
                const unitPrice = fromCents(BigInt(prices[index]));
                await connection.execute(
                    `INSERT INTO order_items (order_id, book_id, quantity, unit_price)
                     VALUES (?, ?, ?, ?)`,
                    [orderId, item.book_id, item.quantity, unitPrice]
                );
            }
            const [dateRows] = await connection.execute(
                "SELECT DATE_FORMAT(CURRENT_DATE, '%Y%m%d') AS bill_date"
            );
            const billNumber = `BH-${dateRows[0].bill_date}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
            await connection.execute(
                `INSERT INTO bills
                    (order_id, bill_number, subtotal, delivery_charge, grand_total,
                     payment_method, payment_status)
                 VALUES (?, ?, ?, 0.00, ?, ?, 'PENDING')`,
                [orderId, billNumber, totalAmount, totalAmount, paymentMethod]
            );
            await connection.execute("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
            await connection.commit();
            transactionStarted = false;
            return this.findOrder(orderId, userId, false);
        } catch (error) {
            if (transactionStarted) {
                await connection.rollback();
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async listOrders(userId, isAdmin) {
        const query = isAdmin
            ? `SELECT ${this.orderColumns()}
               FROM orders o
               LEFT JOIN bills b ON b.order_id = o.order_id
               LEFT JOIN order_payment_attempts p ON p.payment_attempt_id =
                   (SELECT MAX(p2.payment_attempt_id) FROM order_payment_attempts p2 WHERE p2.order_id = o.order_id)
               LEFT JOIN order_refunds r ON r.refund_record_id =
                   (SELECT MAX(r2.refund_record_id) FROM order_refunds r2 WHERE r2.order_id = o.order_id)
               ORDER BY o.order_date DESC, o.order_id DESC`
            : `SELECT ${this.orderColumns()}
               FROM orders o
               LEFT JOIN bills b ON b.order_id = o.order_id
               LEFT JOIN order_payment_attempts p ON p.payment_attempt_id =
                   (SELECT MAX(p2.payment_attempt_id) FROM order_payment_attempts p2 WHERE p2.order_id = o.order_id)
               LEFT JOIN order_refunds r ON r.refund_record_id =
                   (SELECT MAX(r2.refund_record_id) FROM order_refunds r2 WHERE r2.order_id = o.order_id)
               WHERE o.user_id = ? ORDER BY o.order_date DESC, o.order_id DESC`;
        const [orders] = await pool.execute(query, isAdmin ? [] : [userId]);
        return orders;
    }

    orderColumns() {
        return `o.order_id, o.user_id, o.order_date,
                DATE_FORMAT(COALESCE(o.expected_delivery_date,
                    DATE_ADD(DATE(o.order_date), INTERVAL 3 DAY)), '%Y-%m-%d') AS expected_delivery_date,
                o.total_amount, o.delivery_address, o.order_status, o.cancelled_at,
                COALESCE(b.payment_method, 'COD') AS payment_method,
                COALESCE(b.payment_status, 'PENDING') AS payment_status,
                p.gateway_order_id, p.gateway_payment_id,
                COALESCE(r.status, 'NOT_REQUIRED') AS refund_status,
                r.gateway_refund_id`;
    }

    async findOrder(orderId, userId, isAdmin) {
        const query = isAdmin
            ? `SELECT ${this.orderColumns()}
               FROM orders o
               LEFT JOIN bills b ON b.order_id = o.order_id
               LEFT JOIN order_payment_attempts p ON p.payment_attempt_id =
                   (SELECT MAX(p2.payment_attempt_id) FROM order_payment_attempts p2 WHERE p2.order_id = o.order_id)
               LEFT JOIN order_refunds r ON r.refund_record_id =
                   (SELECT MAX(r2.refund_record_id) FROM order_refunds r2 WHERE r2.order_id = o.order_id)
               WHERE o.order_id = ? LIMIT 1`
            : `SELECT ${this.orderColumns()}
               FROM orders o
               LEFT JOIN bills b ON b.order_id = o.order_id
               LEFT JOIN order_payment_attempts p ON p.payment_attempt_id =
                   (SELECT MAX(p2.payment_attempt_id) FROM order_payment_attempts p2 WHERE p2.order_id = o.order_id)
               LEFT JOIN order_refunds r ON r.refund_record_id =
                   (SELECT MAX(r2.refund_record_id) FROM order_refunds r2 WHERE r2.order_id = o.order_id)
               WHERE o.order_id = ? AND o.user_id = ? LIMIT 1`;
        const [orders] = await pool.execute(query, isAdmin ? [orderId] : [orderId, userId]);
        return orders[0] || null;
    }

    async listItems(orderId, userId, isAdmin) {
        const ownership = isAdmin ? "" : " AND o.user_id = ?";
        const parameters = isAdmin ? [orderId] : [orderId, userId];
        const [items] = await pool.execute(
            `SELECT oi.order_item_id, oi.book_id, b.title, b.author,
                    oi.quantity, CAST(oi.unit_price AS DECIMAL(10, 2)) AS unit_price,
                    CAST(oi.subtotal AS DECIMAL(10, 2)) AS subtotal
             FROM order_items oi
             JOIN orders o ON o.order_id = oi.order_id
             JOIN books b ON b.book_id = oi.book_id
             WHERE oi.order_id = ?${ownership}
             ORDER BY oi.order_item_id`,
            parameters
        );
        return items;
    }

    async cancelOrder(orderId, userId, isAdmin) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const ownership = isAdmin ? "" : " AND user_id = ?";
            const parameters = isAdmin ? [orderId] : [orderId, userId];
            const [orders] = await connection.execute(
                `SELECT order_id, order_status FROM orders
                 WHERE order_id = ?${ownership} FOR UPDATE`,
                parameters
            );
            const order = orders[0];
            if (!order) {
                const error = new Error("Order not found");
                error.statusCode = 404;
                throw error;
            }
            if (!["PENDING", "CONFIRMED"].includes(order.order_status)) {
                const error = new Error("Only pending or confirmed orders can be cancelled");
                error.statusCode = 409;
                throw error;
            }

            const [payments] = await connection.execute(
                `SELECT b.payment_method, b.payment_status, p.gateway_payment_id,
                        o.total_amount
                 FROM orders o
                 LEFT JOIN bills b ON b.order_id = o.order_id
                 LEFT JOIN order_payment_attempts p ON p.payment_attempt_id =
                     (SELECT MAX(p2.payment_attempt_id) FROM order_payment_attempts p2
                      WHERE p2.order_id = o.order_id AND p2.status = 'CAPTURED')
                 WHERE o.order_id = ? FOR UPDATE`,
                [orderId]
            );
            const payment = payments[0];
            if (payment?.payment_method === "ONLINE" && payment.payment_status === "PAID") {
                if (!payment.gateway_payment_id) {
                    const error = new Error("The verified payment reference is missing; contact support before cancelling");
                    error.statusCode = 409;
                    throw error;
                }
                await connection.execute(
                    `INSERT INTO order_refunds
                        (order_id, gateway_payment_id, amount, status)
                     VALUES (?, ?, ?, 'PENDING')`,
                    [orderId, payment.gateway_payment_id, payment.total_amount]
                );
            }

            const [items] = await connection.execute(
                "SELECT book_id, quantity FROM order_items WHERE order_id = ? ORDER BY book_id FOR UPDATE",
                [orderId]
            );
            for (const item of items) {
                await connection.execute(
                    "UPDATE books SET stock = stock + ? WHERE book_id = ?",
                    [item.quantity, item.book_id]
                );
            }
            await connection.execute(
                `UPDATE orders SET order_status = 'CANCELLED', cancelled_at = NOW(),
                    cancellation_stock_restored_at = NOW() WHERE order_id = ?`,
                [orderId]
            );
            await connection.commit();
            transactionStarted = false;
            return this.findOrder(orderId, userId, isAdmin);
        } catch (error) {
            if (transactionStarted) {
                await connection.rollback();
            }
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new OrderRepository();
