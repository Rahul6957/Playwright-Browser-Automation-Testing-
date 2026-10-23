const authService = require("../services/authService");
const { handleControllerError } = require("../utils/errors");

class AuthController {


// Register user
async register(req, res) {
    try {
        const user = await authService.register(req.body || {});

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: user
        });
    } catch (error) {
        return handleControllerError(res, error, "Failed to register user");
    }
}

// Login user
async login(req, res) {
    try {
        const { email, password } = req.body || {};

        const result = await authService.login(email, password);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: result
        });
    } catch (error) {
        return handleControllerError(res, error, "Failed to log in");
    }
}

async profile(req, res) {
    try {
        const user = await authService.getProfile(req.user.user_id);
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        return handleControllerError(res, error, "Failed to fetch profile");
    }
}
}

module.exports = new AuthController();
