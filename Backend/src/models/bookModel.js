class Book {
    constructor({
        book_id,
        category_id,
        title,
        author,
        description,
        price,
        stock,
        image_url
    }) {
        this.book_id = book_id;
        this.category_id = category_id;
        this.title = title;
        this.author = author;
        this.description = description;
        this.price = price;
        this.stock = stock;
        this.image_url = image_url;
    }
}

module.exports = Book;