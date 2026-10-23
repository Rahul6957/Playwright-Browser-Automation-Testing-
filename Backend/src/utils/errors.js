function createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function handleControllerError(res, error, fallbackMessage) {
    const statusCode = Number.isInteger(error.statusCode)
        ? error.statusCode
        : error.code === "ER_DUP_ENTRY"
            ? 409
            : error.code === "ER_NO_REFERENCED_ROW_2"
                ? 400
                : error.code === "ER_ROW_IS_REFERENCED_2"
                    ? 409
                    : 500;

    if (statusCode >= 500) {
        console.error(error);
    }

    return res.status(statusCode).json({
        success: false,
        message: statusCode === 500
            ? fallbackMessage
            : statusCode === 409 && error.code === "ER_DUP_ENTRY"
                ? "A record with the same unique value already exists"
                : statusCode === 400 && error.code === "ER_NO_REFERENCED_ROW_2"
                    ? "Referenced record does not exist"
                    : statusCode === 409 && error.code === "ER_ROW_IS_REFERENCED_2"
                        ? "This record is in use and cannot be deleted"
                        : error.message
    });
}

module.exports = { createError, handleControllerError };
