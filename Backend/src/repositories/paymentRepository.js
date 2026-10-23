const pool = require("../config/db");
const { createError } = require("../utils/errors");

class PaymentRepository {
    async reserveAttempt(orderId, userId) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [orders] = await connection.execute(
                `SELECT o.order_id, o.order_status, o.total_amount, b.payment_method, b.payment_status
                 FROM orders o JOIN bills b ON b.order_id = o.order_id
                 WHERE o.order_id = ? AND o.user_id = ? FOR UPDATE`,
                [orderId, userId]
            );
            const order = orders[0];
            if (!order) throw createError("Order not found", 404);
            if (order.order_status !== "PENDING" ||
                order.payment_method !== "ONLINE" ||
                order.payment_status === "PAID") {
                throw createError("This order is not awaiting online payment", 409);
            }

            const [attempts] = await connection.execute(
                `SELECT payment_attempt_id, gateway_order_id, amount, status, created_at
                 FROM order_payment_attempts
                 WHERE order_id = ? ORDER BY payment_attempt_id DESC LIMIT 1 FOR UPDATE`,
                [orderId]
            );
            const previous = attempts[0];
            if (previous?.status === "CREATED") {
                await connection.commit();
                transactionStarted = false;
                return { ...previous, reused: true };
            }
            if (previous?.status === "CREATING") {
                const [stale] = await connection.execute(
                    `SELECT created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE) AS is_stale
                     FROM order_payment_attempts WHERE payment_attempt_id = ?`,
                    [previous.payment_attempt_id]
                );
                if (!stale[0].is_stale) {
                    throw createError("Online payment setup is already in progress. Please try again shortly.", 409);
                }
                await connection.execute(
                    "UPDATE order_payment_attempts SET status = 'FAILED', failure_reason = 'Timed out during gateway setup' WHERE payment_attempt_id = ?",
                    [previous.payment_attempt_id]
                );
            }

            const [result] = await connection.execute(
                `INSERT INTO order_payment_attempts (order_id, amount, status)
                 VALUES (?, ?, 'CREATING')`,
                [orderId, order.total_amount]
            );
            await connection.execute(
                "UPDATE bills SET payment_status = 'PENDING' WHERE order_id = ?",
                [orderId]
            );
            await connection.commit();
            transactionStarted = false;
            return {
                payment_attempt_id: result.insertId,
                amount: order.total_amount,
                status: "CREATING",
                reused: false
            };
        } catch (error) {
            if (transactionStarted) await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async completeAttempt(attemptId, gatewayOrderId) {
        await pool.execute(
            `UPDATE order_payment_attempts
             SET gateway_order_id = ?, status = 'CREATED'
             WHERE payment_attempt_id = ? AND status = 'CREATING'`,
            [gatewayOrderId, attemptId]
        );
        const [rows] = await pool.execute(
            `SELECT payment_attempt_id, order_id, gateway_order_id, amount, status
             FROM order_payment_attempts WHERE payment_attempt_id = ?`,
            [attemptId]
        );
        return rows[0];
    }

    async failAttempt(attemptId, reason) {
        await pool.execute(
            `UPDATE order_payment_attempts SET status = 'FAILED', failure_reason = ?
             WHERE payment_attempt_id = ? AND status = 'CREATING'`,
            [String(reason).slice(0, 500), attemptId]
        );
    }

    async findAttempt(gatewayOrderId, userId) {
        const [rows] = await pool.execute(
            `SELECT p.payment_attempt_id, p.order_id, p.gateway_order_id, p.gateway_payment_id,
                    p.amount, p.status, o.user_id, o.order_status, b.payment_status
             FROM order_payment_attempts p
             JOIN orders o ON o.order_id = p.order_id
             JOIN bills b ON b.order_id = o.order_id
             WHERE p.gateway_order_id = ? AND o.user_id = ? LIMIT 1`,
            [gatewayOrderId, userId]
        );
        return rows[0] || null;
    }

    async findAttemptByGatewayOrderId(gatewayOrderId) {
        const [rows] = await pool.execute(
            `SELECT p.payment_attempt_id, p.order_id, p.gateway_order_id,
                    p.gateway_payment_id, p.amount, p.status, o.user_id,
                    o.order_status, b.payment_status
             FROM order_payment_attempts p
             JOIN orders o ON o.order_id = p.order_id
             JOIN bills b ON b.order_id = o.order_id
             WHERE p.gateway_order_id = ? LIMIT 1`,
            [gatewayOrderId]
        );
        return rows[0] || null;
    }

    async confirmPayment(attempt, payment, signatureVerified) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [rows] = await connection.execute(
                `SELECT o.order_id, o.order_status, b.payment_status,
                        p.payment_attempt_id, p.gateway_payment_id, p.status
                 FROM order_payment_attempts p
                 JOIN orders o ON o.order_id = p.order_id
                 JOIN bills b ON b.order_id = o.order_id
                 WHERE p.payment_attempt_id = ? FOR UPDATE`,
                [attempt.payment_attempt_id]
            );
            const current = rows[0];
            if (!current) throw createError("Payment attempt not found", 404);
            if (current.gateway_payment_id === payment.id &&
                current.status === "CAPTURED") {
                await connection.commit();
                transactionStarted = false;
                return { duplicate: true, refund_required: current.order_status === "CANCELLED" };
            }
            if (current.payment_status === "PAID") {
                throw createError("A payment is already recorded for this order", 409);
            }

            await connection.execute(
                `UPDATE order_payment_attempts
                 SET gateway_payment_id = ?, status = 'CAPTURED',
                     signature_verified = ?, failure_reason = NULL
                 WHERE payment_attempt_id = ?`,
                [payment.id, signatureVerified ? 1 : 0, attempt.payment_attempt_id]
            );
            await connection.execute(
                "UPDATE bills SET payment_status = 'PAID' WHERE order_id = ? AND payment_status <> 'PAID'",
                [current.order_id]
            );

            if (current.order_status === "CANCELLED") {
                const [orderRows] = await connection.execute(
                    "SELECT total_amount FROM orders WHERE order_id = ?",
                    [current.order_id]
                );
                await connection.execute(
                    `INSERT INTO order_refunds
                        (order_id, gateway_payment_id, amount, status)
                     VALUES (?, ?, ?, 'PENDING')
                     ON DUPLICATE KEY UPDATE gateway_payment_id = VALUES(gateway_payment_id)`,
                    [current.order_id, payment.id, orderRows[0].total_amount]
                );
                await connection.commit();
                transactionStarted = false;
                return { duplicate: false, refund_required: true };
            }

            if (current.order_status !== "PENDING") {
                throw createError("Order is no longer awaiting payment", 409);
            }
            await connection.execute(
                "UPDATE bills SET payment_status = 'PAID' WHERE order_id = ? AND payment_status <> 'PAID'",
                [current.order_id]
            );
            await connection.execute(
                "UPDATE orders SET order_status = 'CONFIRMED' WHERE order_id = ? AND order_status = 'PENDING'",
                [current.order_id]
            );
            await connection.commit();
            transactionStarted = false;
            return { duplicate: false, refund_required: false };
        } catch (error) {
            if (transactionStarted) await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async markPaymentFailed(gatewayOrderId, gatewayPaymentId, reason) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [rows] = await connection.execute(
                `SELECT p.payment_attempt_id, p.order_id, o.order_status, b.payment_status
                 FROM order_payment_attempts p
                 JOIN orders o ON o.order_id = p.order_id
                 JOIN bills b ON b.order_id = o.order_id
                 WHERE p.gateway_order_id = ? FOR UPDATE`,
                [gatewayOrderId]
            );
            if (!rows.length) {
                await connection.commit();
                transactionStarted = false;
                return;
            }
            const attempt = rows[0];
            if (attempt.payment_status !== "PAID") {
                await connection.execute(
                    `UPDATE order_payment_attempts
                     SET gateway_payment_id = COALESCE(?, gateway_payment_id),
                         status = 'FAILED', failure_reason = ?
                     WHERE payment_attempt_id = ? AND status <> 'CAPTURED'`,
                    [gatewayPaymentId || null, String(reason || "Payment failed").slice(0, 500), attempt.payment_attempt_id]
                );
                await connection.execute(
                    "UPDATE bills SET payment_status = 'FAILED' WHERE order_id = ? AND payment_status = 'PENDING'",
                    [attempt.order_id]
                );
            }
            await connection.commit();
            transactionStarted = false;
        } catch (error) {
            if (transactionStarted) await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async claimRefund(orderId, paymentId) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [rows] = await connection.execute(
                `SELECT refund_record_id, gateway_payment_id, amount, gateway_refund_id,
                        status, requested_at
                 FROM order_refunds
                 WHERE order_id = ? AND gateway_payment_id = ? FOR UPDATE`,
                [orderId, paymentId]
            );
            const refund = rows[0];
            if (!refund || refund.gateway_refund_id || refund.requested_at) {
                await connection.commit();
                transactionStarted = false;
                return null;
            }
            await connection.execute(
                "UPDATE order_refunds SET requested_at = NOW() WHERE refund_record_id = ?",
                [refund.refund_record_id]
            );
            await connection.commit();
            transactionStarted = false;
            return refund;
        } catch (error) {
            if (transactionStarted) await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async saveRefundResult(orderId, paymentId, response) {
        const status = response.status === "processed" ? "PROCESSED" :
            response.status === "failed" ? "FAILED" : "PENDING";
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            await connection.execute(
                `UPDATE order_refunds
                 SET gateway_refund_id = ?, status =
                         CASE WHEN status IN ('PROCESSED', 'FAILED') THEN status ELSE ? END,
                     processed_at = IF(? = 'PROCESSED', NOW(), processed_at),
                     failure_reason = IF(? = 'FAILED', 'Gateway reported refund failure', NULL)
                 WHERE order_id = ? AND gateway_payment_id = ?`,
                [response.id, status, status, status, orderId, paymentId]
            );
            if (status === "PROCESSED") {
                await connection.execute(
                    "UPDATE bills SET payment_status = 'REFUNDED' WHERE order_id = ?",
                    [orderId]
                );
                await connection.execute(
                    `UPDATE order_payment_attempts
                     SET status = 'CAPTURED'
                     WHERE order_id = ? AND gateway_payment_id = ?`,
                    [orderId, paymentId]
                );
            }
            await connection.commit();
            transactionStarted = false;
            return status;
        } catch (error) {
            if (transactionStarted) await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateRefundFromWebhook(refundId, paymentId, status) {
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [rows] = await connection.execute(
                `SELECT order_id, gateway_payment_id FROM order_refunds
                 WHERE gateway_refund_id = ? OR (gateway_payment_id = ? AND gateway_refund_id IS NULL)
                 LIMIT 1 FOR UPDATE`,
                [refundId, paymentId]
            );
            if (rows.length) {
                const orderId = rows[0].order_id;
                await connection.execute(
                    `UPDATE order_refunds SET gateway_refund_id = COALESCE(gateway_refund_id, ?),
                        status = CASE WHEN ? = 'PROCESSED' THEN 'PROCESSED'
                            WHEN status = 'PROCESSED' THEN status ELSE 'FAILED' END,
                        processed_at = IF(? = 'PROCESSED', NOW(), processed_at)
                     WHERE order_id = ? AND gateway_payment_id = ?`,
                    [refundId, status, status, status, orderId, rows[0].gateway_payment_id]
                );
                if (status === "PROCESSED") {
                    await connection.execute(
                        "UPDATE bills SET payment_status = 'REFUNDED' WHERE order_id = ?",
                        [orderId]
                    );
                }
            }
            await connection.commit();
            transactionStarted = false;
        } catch (error) {
            if (transactionStarted) await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new PaymentRepository();
