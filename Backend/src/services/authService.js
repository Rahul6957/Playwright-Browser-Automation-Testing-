const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authRepository = require("../repositories/authRepository");
const { createError } = require("../utils/errors");

class AuthService {
    async register(userData = {}) {
        const { full_name, email, password, phone } = userData;
        if (
            typeof full_name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !full_name.trim() ||
            !email.trim() ||
            !password
        ) {
            throw createError("Full name, email and password are required", 400);
        }

        const normalizedName = full_name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedName.length > 100) {
            throw createError("Full name must be at most 100 characters", 400);
        }
        if (normalizedEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            throw createError("Invalid email format", 400);
        }
        if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
            throw createError("Password must be 8 to 72 bytes long", 400);
        }
        if (phone !== undefined && phone !== null &&
            (typeof phone !== "string" || phone.length > 15)) {
            throw createError("Phone must be at most 15 characters", 400);
        }

        if (await authRepository.findByEmail(normalizedEmail)) {
            throw createError("Email is already registered", 409);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            return await authRepository.createUser({
                full_name: normalizedName,
                email: normalizedEmail,
                password: hashedPassword,
                phone
            });
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                throw createError("Email is already registered", 409);
            }
            throw error;
        }
    }

    async login(email, password) {
        if (typeof email !== "string" || typeof password !== "string" ||
            !email.trim() || !password) {
            throw createError("Email and password are required", 400);
        }
        if (Buffer.byteLength(password, "utf8") > 72) {
            throw createError("Invalid email or password", 401);
        }

        const user = await authRepository.findByEmail(email.trim().toLowerCase());
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw createError("Invalid email or password", 401);
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign(
            { userId: user.user_id },
            secret,
            { expiresIn: "1h" }
        );
        const safeUser = await authRepository.findById(user.user_id);
        return { user: safeUser, token };
    }

    async getProfile(userId) {
        const user = await authRepository.findById(userId);
        if (!user) {
            throw createError("User not found", 404);
        }
        return user;
    }
}

module.exports = new AuthService();
