ALTER TABLE orders
    ADD COLUMN expected_delivery_date DATE NULL AFTER order_date,
    ADD COLUMN cancelled_at DATETIME NULL AFTER order_status,
    ADD COLUMN cancellation_stock_restored_at DATETIME NULL AFTER cancelled_at;

UPDATE orders
SET expected_delivery_date = DATE_ADD(COALESCE(DATE(order_date), CURRENT_DATE), INTERVAL 3 DAY)
WHERE expected_delivery_date IS NULL;

CREATE TABLE order_payment_attempts (
    payment_attempt_id BIGINT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,
    gateway_order_id VARCHAR(100) NULL,
    gateway_payment_id VARCHAR(100) NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('CREATING', 'CREATED', 'FAILED', 'CAPTURED') NOT NULL DEFAULT 'CREATING',
    signature_verified TINYINT(1) NOT NULL DEFAULT 0,
    failure_reason VARCHAR(500) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_attempt_id),
    UNIQUE KEY uq_payment_gateway_order (gateway_order_id),
    UNIQUE KEY uq_payment_gateway_payment (gateway_payment_id),
    KEY ix_payment_attempt_order (order_id, payment_attempt_id),
    CONSTRAINT fk_payment_attempt_order FOREIGN KEY (order_id)
        REFERENCES orders (order_id),
    CONSTRAINT chk_payment_attempt_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_refunds (
    refund_record_id BIGINT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,
    gateway_payment_id VARCHAR(100) NOT NULL,
    gateway_refund_id VARCHAR(100) NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('PENDING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    requested_at DATETIME NULL,
    processed_at DATETIME NULL,
    failure_reason VARCHAR(500) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (refund_record_id),
    UNIQUE KEY uq_refund_order_payment (order_id, gateway_payment_id),
    UNIQUE KEY uq_refund_gateway_id (gateway_refund_id),
    KEY ix_refund_status (status),
    CONSTRAINT fk_refund_order FOREIGN KEY (order_id)
        REFERENCES orders (order_id),
    CONSTRAINT chk_refund_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
