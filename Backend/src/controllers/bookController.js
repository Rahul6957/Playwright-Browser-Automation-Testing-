const bookService = require("../services/bookService");
const { handleControllerError } = require("../utils/errors");

class BookController {

    async getAllBooks(req, res) {
        try {
            const books = await bookService.getAllBooks();

            res.status(200).json({
                success: true,
                count: books.length,
                data: books
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch books");
        }
    }
    async updateBook(req, res) {
    try {
        const bookId = req.params.id;

        const book = await bookService.updateBook(
            bookId,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Book updated successfully",
            data: book
        });
    } catch (error) {
        return handleControllerError(res, error, "Failed to update book");
    }
    
}

    async getBookById(req, res) {
        try {
            const bookId = req.params.id;
            const book = await bookService.getBookById(bookId);

            res.status(200).json({
                success: true,
                data: book
            });
        } catch (error) {
            return handleControllerError(res, error, "Failed to fetch book");
        }
    }

    async createBook(req, res) {
    try {
        const book = await bookService.createBook(req.body);

        res.status(201).json({
            success: true,
            message: "Book created successfully",
            data: book
        });
    } catch (error) {
        return handleControllerError(res, error, "Failed to create book");
    }
}
async deleteBook(req, res) {
    try {
        const bookId = req.params.id;

        await bookService.deleteBook(bookId);

        res.status(200).json({
            success: true,
            message: "Book deleted successfully"
        });
    } catch (error) {
        return handleControllerError(res, error, "Failed to delete book");
    }
}
}

module.exports = new BookController();