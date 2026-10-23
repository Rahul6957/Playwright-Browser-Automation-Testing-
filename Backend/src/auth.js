const jwt = require("jsonwebtoken");
const authRepository = require("./repositories/authRepository");

async function authenticate(req, res, next) {
    const authorization = req.get("authorization");
    const match = typeof authorization === "string"
        ? authorization.match(/^Bearer\s+(\S+)$/i)
        : null;

    if (!match) {
        return res.status(401).json({
            success: false,
            message: "A valid Bearer token is required"
        });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({
            success: false,
            message: "Authentication is not configured"
        });
    }

    try {
        const payload = jwt.verify(match[1], secret);
        if (!payload || typeof payload !== "object" || !Number.isSafeInteger(payload.userId)) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        const user = await authRepository.findById(payload.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }
        return next(error);
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Administrator access is required"
        });
    }
    return next();
}

module.exports = { authenticate, requireAdmin };
