const crypto = require("crypto");
const pool = require("../config/db");
const { toCents, fromCents } = require("../utils/money");

class BillRepository {
    async getOrCreateBill(orderId, userId, isAdmin) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [orders] = await connection.execute(
                `SELECT order_id, user_id, order_date,
                        DATE_FORMAT(COALESCE(expected_delivery_date,
                            DATE_ADD(DATE(order_date), INTERVAL 3 DAY)), '%Y-%m-%d') AS expected_delivery_date,
                        total_amount, delivery_address, order_status
                 FROM orders WHERE order_id = ? FOR UPDATE`,
                [orderId]
            );
            const order = orders[0];
            if (!order || (!isAdmin && order.user_id !== userId)) {
                const error = new Error("Order not found");
                error.statusCode = 404;
                throw error;
            }

            let [bills] = await connection.execute(
                `SELECT bill_id, order_id, bill_number, subtotal, delivery_charge,
                        grand_total, payment_method, payment_status, generated_at
                 FROM bills WHERE order_id = ? LIMIT 1`,
                [orderId]
            );
            if (!bills.length) {
                const [totals] = await connection.execute(
                    `SELECT CAST(COALESCE(SUM(subtotal), 0) AS DECIMAL(10, 2)) AS subtotal
                     FROM order_items WHERE order_id = ?`,
                    [orderId]
                );
                const subtotal = totals[0].subtotal;
                const deliveryCharge = "0.00";
                const grandTotal = fromCents(toCents(subtotal));
                const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                const billNumber = `BH-${date}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
                await connection.execute(
                    `INSERT INTO bills
                        (order_id, bill_number, subtotal, delivery_charge, grand_total,
                         payment_method, payment_status)
                     VALUES (?, ?, ?, ?, ?, 'COD', 'PENDING')`,
                    [orderId, billNumber, subtotal, deliveryCharge, grandTotal]
                );
                [bills] = await connection.execute(
                    `SELECT bill_id, order_id, bill_number, subtotal, delivery_charge,
                            grand_total, payment_method, payment_status, generated_at
                     FROM bills WHERE order_id = ? LIMIT 1`,
                    [orderId]
                );
            }

            const [items] = await connection.execute(
                `SELECT oi.order_item_id, oi.book_id, b.title, b.author,
                        oi.quantity, CAST(oi.unit_price AS DECIMAL(10, 2)) AS unit_price,
                        CAST(oi.subtotal AS DECIMAL(10, 2)) AS subtotal
                 FROM order_items oi
                 JOIN books b ON b.book_id = oi.book_id
                 WHERE oi.order_id = ?
                 ORDER BY oi.order_item_id`,
                [orderId]
            );
            await connection.commit();
            transactionStarted = false;
            return { bill: bills[0], order, items };
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

module.exports = new BillRepository();
