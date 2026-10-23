const bookRepository = require("../repositories/bookRepository");
const { createError } = require("../utils/errors");
const {
    parsePositiveId,
    parsePrice,
    parseNonNegativeStock
} = require("../utils/validation");

class BookService {

    async getAllBooks() {
        return await bookRepository.getAllBooks();
    }

    async getBookById(bookId) {
        bookId = parsePositiveId(bookId, "book ID");

        const book = await bookRepository.getBookById(bookId);

        if (!book) {
            const error = new Error("Book not found");
            error.statusCode = 404;
            throw error;
        }

        return book;
    }
    async createBook(bookData) {
    bookData = bookData && typeof bookData === "object" ? bookData : {};
    const {
        category_id,
        title,
        author,
        price,
        stock
    } = bookData;

    if (
        category_id === undefined ||
        typeof title !== "string" || !title.trim() ||
        typeof author !== "string" || !author.trim() ||
        price === undefined ||
        stock === undefined
    ) {
        throw createError(
            "Category, title, author, price and stock are required"
            ,400
        );
    }

    const normalizedCategoryId = parsePositiveId(category_id, "category ID");
    const normalizedPrice = parsePrice(price);
    const normalizedStock = parseNonNegativeStock(stock);
    if (title.trim().length > 200 || author.trim().length > 150 ||
        bookData.image_url !== undefined && bookData.image_url !== null &&
        (typeof bookData.image_url !== "string" || bookData.image_url.length > 500) ||
        bookData.description !== undefined && bookData.description !== null &&
        typeof bookData.description !== "string") {
        throw createError("Book fields are invalid or exceed the maximum length", 400);
    }

    return bookRepository.createBook({
        ...bookData,
        category_id: normalizedCategoryId,
        title: title.trim(),
        author: author.trim(),
        price: normalizedPrice,
        stock: normalizedStock
    });
    }

    async updateBook(bookId, bookData) {
    bookId = parsePositiveId(bookId, "book ID");
    bookData = bookData && typeof bookData === "object" ? bookData : {};
    const { category_id, title, author, price, stock } = bookData;

    if (category_id === undefined || typeof title !== "string" || !title.trim() ||
        typeof author !== "string" || !author.trim() ||
        price === undefined || stock === undefined) {
        throw createError("Category, title, author, price and stock are required", 400);
    }

    const normalizedCategoryId = parsePositiveId(category_id, "category ID");
    const normalizedPrice = parsePrice(price);
    const normalizedStock = parseNonNegativeStock(stock);
    if (title.trim().length > 200 || author.trim().length > 150 ||
        bookData.image_url !== undefined && bookData.image_url !== null &&
        (typeof bookData.image_url !== "string" || bookData.image_url.length > 500) ||
        bookData.description !== undefined && bookData.description !== null &&
        typeof bookData.description !== "string") {
        throw createError("Book fields are invalid or exceed the maximum length", 400);
    }

    const book = await bookRepository.updateBook(bookId, {
        ...bookData,
        category_id: normalizedCategoryId,
        title: title.trim(),
        author: author.trim(),
        price: normalizedPrice,
        stock: normalizedStock
    });

    if (!book) {
        throw createError("Book not found", 404);
    }
    return book;
    }

    async deleteBook(bookId) {
    bookId = parsePositiveId(bookId, "book ID");
    const deleted = await bookRepository.deleteBook(bookId);

    if (!deleted) {
        throw createError("Book not found or already deleted", 404);
    }
    return true;
    }
}

module.exports = new BookService();