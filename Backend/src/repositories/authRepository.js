const pool = require("../config/db");
const User = require("../models/userModel");

class AuthRepository {


async findByEmail(email) {
    const query = `
        SELECT user_id, full_name, email, password, phone, role, created_at, updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    const [rows] = await pool.execute(query, [email]);

    return rows.length > 0 ? rows[0] : null;
}

async createUser(userData) {
    const {
        full_name,
        email,
        password,
        phone
    } = userData;

    const query = `
        INSERT INTO users
        (full_name, email, password, phone, role)
        VALUES (?, ?, ?, ?, 'USER')
    `;

    const [result] = await pool.execute(query, [
        full_name,
        email,
        password,
        phone || null
    ]);

    return this.findById(result.insertId);
}

async findById(userId) {
    const query = `
        SELECT
            user_id,
            full_name,
            email,
            phone,
            role,
            created_at,
            updated_at
        FROM users
        WHERE user_id = ?
        LIMIT 1
    `;

    const [rows] = await pool.execute(query, [userId]);

    if (rows.length === 0) {
        return null;
    }

    return new User(rows[0]);
}


}

module.exports = new AuthRepository();
