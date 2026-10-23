const pool = require("../config/db");
const Category = require("../models/categoryModel");

class CategoryRepository {

    // Get all categories
    async getAllCategories() {
        const query = `
            SELECT category_id, category_name, description
            FROM categories
            ORDER BY category_id DESC
        `;

        const [rows] = await pool.query(query);

        return rows.map(row => new Category(row));
    }

    // Get category by ID
    async getCategoryById(categoryId) {
        const query = `
            SELECT category_id, category_name, description
            FROM categories
            WHERE category_id = ?
            LIMIT 1
        `;

        const [rows] = await pool.execute(query, [categoryId]);

        if (rows.length === 0) {
            return null;
        }

        return new Category(rows[0]);
    }

    // Create category
    async createCategory(categoryData) {
        const { category_name, description } = categoryData;

        const query = `
            INSERT INTO categories (category_name, description)
            VALUES (?, ?)
        `;

        const [result] = await pool.execute(query, [
            category_name,
            description || null
        ]);

        return this.getCategoryById(result.insertId);
    }

    // Update category
    async updateCategory(categoryId, categoryData) {
        const { category_name, description } = categoryData;

        const query = `
            UPDATE categories
            SET category_name = ?, description = ?
            WHERE category_id = ?
        `;

        await pool.execute(query, [
            category_name,
            description || null,
            categoryId
        ]);

        return this.getCategoryById(categoryId);
    }

    // Delete category
    async deleteCategory(categoryId) {
        const query = `
            DELETE FROM categories
            WHERE category_id = ?
        `;

        const [result] = await pool.execute(query, [categoryId]);

        return result.affectedRows > 0;
    }
}

module.exports = new CategoryRepository();