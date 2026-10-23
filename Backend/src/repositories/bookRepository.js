const pool = require("../config/db");
const Book = require("../models/bookModel");

class BookRepository {
    async updateBook(bookId, bookData) {
    const {
        category_id,
        title,
        author,
        description,
        price,
        stock,
        image_url
    } = bookData;

    const query = `
        UPDATE books
        SET
            category_id = ?,
            title = ?,
            author = ?,
            description = ?,
            price = ?,
            stock = ?,
            image_url = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ? AND is_active = TRUE
    `;

    await pool.execute(query, [
        category_id,
        title,
        author,
        description || null,
        price,
        stock,
        image_url || null,
        bookId
    ]);

    return this.getBookById(bookId);
}
    async createBook(bookData) {
    const {
        category_id,
        title,
        author,
        description,
        price,
        stock,
        image_url
    } = bookData;

    const query = `
        INSERT INTO books
        (
            category_id,
            title,
            author,
            description,
            price,
            stock,
            image_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
        category_id,
        title,
        author,
        description || null,
        price,
        stock,
        image_url || null
    ]);

    return this.getBookById(result.insertId);
}

    // Get all active books
    async getAllBooks() {
        const query = `
            SELECT
                book_id,
                category_id,
                title,
                author,
                description,
                price,
                stock,
                image_url
            FROM books
            WHERE is_active = TRUE
            ORDER BY book_id DESC
        `;

        const [rows] = await pool.query(query);

        return rows.map(row => new Book(row));
    }

    // Get book by ID
    async getBookById(bookId) {
        const query = `
            SELECT
                book_id,
                category_id,
                title,
                author,
                description,
                price,
                stock,
                image_url
            FROM books
            WHERE book_id = ? AND is_active = TRUE
            LIMIT 1
        `;

        const [rows] = await pool.execute(query, [bookId]);

        if (rows.length === 0) {
            return null;
        }

        return new Book(rows[0]);



        
    }
    async deleteBook(bookId) {
    const query = `
        UPDATE books
        SET is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE book_id = ? AND is_active = TRUE
    `;

    const [result] = await pool.execute(query, [bookId]);

    return result.affectedRows > 0;
}
}

module.exports = new BookRepository();