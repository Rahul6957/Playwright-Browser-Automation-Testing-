const pool = require("../src/config/db");

const books = [
    {
        title: "The Pragmatic Programmer",
        author: "Andy Hunt and Dave Thomas",
        description: "Practical guidance on software development, problem-solving, and building maintainable systems.",
        category_id: 1,
        price: "500.00",
        stock: 10,
        image_url: "https://covers.openlibrary.org/b/id/10143650-L.jpg?default=false"
    },
    {
        title: "Eloquent JavaScript",
        author: "Marijn Haverbeke",
        description: "An introduction to JavaScript, programming concepts, and building applications for the browser and Node.js.",
        category_id: 3,
        price: "500.00",
        stock: 10,
        image_url: "https://covers.openlibrary.org/b/id/7082166-L.jpg?default=false"
    },
    {
        title: "Learning SQL",
        author: "Alan Beaulieu",
        description: "A practical introduction to SQL queries and relational database concepts.",
        category_id: 2,
        price: "500.00",
        stock: 10,
        image_url: "https://covers.openlibrary.org/b/id/8686154-L.jpg?default=false"
    },
    {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        description: "Bilbo Baggins joins a company of dwarves on a journey to reclaim their home and treasure from a dragon.",
        category_id: 4,
        price: "500.00",
        stock: 10,
        image_url: "https://covers.openlibrary.org/b/id/14627509-L.jpg?default=false"
    }
];

async function seedBooks() {
    const connection = await pool.getConnection();
    let lockAcquired = false;
    let transactionStarted = false;

    try {
        const [lockRows] = await connection.execute(
            "SELECT GET_LOCK(?, 10) AS lock_acquired",
            ["bookhub_catalog_seed_v1"]
        );
        if (lockRows[0].lock_acquired !== 1) {
            throw new Error("Could not acquire the BookHub seed lock; no books were changed.");
        }
        lockAcquired = true;

        await connection.beginTransaction();
        transactionStarted = true;

        for (const book of books) {
            const [matches] = await connection.execute(
                `SELECT book_id
                 FROM books
                 WHERE LOWER(TRIM(title)) = LOWER(?)
                   AND LOWER(TRIM(author)) = LOWER(?)
                 LIMIT 1
                 FOR UPDATE`,
                [book.title, book.author]
            );

            if (matches.length > 0) {
                console.log(`Skipped existing book: ${book.title} (${book.author})`);
                continue;
            }

            await connection.execute(
                `INSERT INTO books
                    (title, author, description, category_id, price, stock, image_url, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [
                    book.title,
                    book.author,
                    book.description,
                    book.category_id,
                    book.price,
                    book.stock,
                    book.image_url
                ]
            );
            console.log(`Inserted: ${book.title} (${book.author})`);
        }

        await connection.commit();
        transactionStarted = false;

        const titles = books.map((book) => book.title);
        const placeholders = titles.map(() => "?").join(", ");
        const [seededRows] = await connection.execute(
            `SELECT title, author, description, category_id, price, stock, image_url, is_active
             FROM books
             WHERE title IN (${placeholders})
             ORDER BY title`,
            titles
        );
        console.log(`Verified ${seededRows.length} seeded title(s):`);
        console.log(JSON.stringify(seededRows, null, 2));
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        throw error;
    } finally {
        if (lockAcquired) {
            await connection.execute("SELECT RELEASE_LOCK(?)", ["bookhub_catalog_seed_v1"]);
        }
        connection.release();
    }
}

seedBooks()
    .catch((error) => {
        console.error(`Book seed failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
