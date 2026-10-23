const pool = require("../src/config/db");

const catalog = [
    ["Mrityunjay", "Shivaji Sawant", "Marathi Literature", "A Marathi retelling of the Mahabharata through the perspective of Karna.", 499, 18],
    ["Chhava", "Shivaji Sawant", "Marathi Literature", "A historical Marathi novel about Sambhaji Maharaj and the struggle to defend the Maratha kingdom.", 449, 16],
    ["Yayati", "V. S. Khandekar", "Marathi Literature", "A landmark Marathi novel that revisits the Mahabharata story of King Yayati and the costs of desire.", 399, 20],
    ["Shyamchi Aai", "Sane Guruji", "Marathi Literature", "A tender Marathi memoir of a boy's childhood and the values taught by his mother.", 249, 24],
    ["Kosala", "Bhalchandra Nemade", "Marathi Literature", "A modern Marathi novel told through the searching, often wry reflections of a young student.", 349, 18],
    ["Panipat", "Vishwas Patil", "Marathi Literature", "A sweeping Marathi historical novel about the people and events surrounding the Third Battle of Panipat.", 499, 14],
    ["Swami", "Ranjit Desai", "Marathi Literature", "A Marathi historical novel about Madhavrao Peshwa and a turbulent period in Maratha history.", 399, 17],
    ["Rau", "N. S. Inamdar", "Marathi Literature", "A Marathi historical romance centered on Peshwa Bajirao and Mastani.", 399, 18],
    ["Shriman Yogi", "Ranjit Desai", "Marathi Literature", "An expansive Marathi historical novel following the life and leadership of Shivaji Maharaj.", 599, 12],
    ["Batatyachi Chaal", "P. L. Deshpande", "Marathi Literature", "A beloved Marathi comic work observing the everyday lives of residents in a Mumbai chawl.", 299, 20],
    ["Vyakti Ani Valli", "P. L. Deshpande", "Marathi Literature", "A collection of affectionate and humorous Marathi character sketches.", 299, 20],
    ["Amrutvel", "V. S. Khandekar", "Marathi Literature", "A Marathi novel exploring human relationships, ideals, and personal choices.", 349, 16],
    ["Bangarwadi", "Vyankatesh Madgulkar", "Marathi Literature", "A Marathi village novel portraying community life and change in a remote settlement.", 299, 18],
    ["Duniyadari", "Suhas Shirvalkar", "Marathi Literature", "A popular Marathi coming-of-age novel about friendship, college life, and difficult choices.", 399, 20],
    ["Partner", "Suhas Shirvalkar", "Marathi Literature", "A Marathi relationship novel about companionship, ambition, and the turns of everyday life.", 349, 16],

    ["The Immortals of Meluha", "Amish Tripathi", "Indian Mythology", "The first Shiva novel imagines a civilization awaiting a leader who may become its prophesied saviour.", 399, 20],
    ["The Secret of the Nagas", "Amish Tripathi", "Indian Mythology", "In the second Shiva novel, the search for answers leads into the world of the Nagas.", 399, 18],
    ["The Oath of the Vayuputras", "Amish Tripathi", "Indian Mythology", "The concluding Shiva novel brings the conflict over good, evil, and justice to a reckoning.", 449, 16],
    ["The Palace of Illusions", "Chitra Banerjee Divakaruni", "Indian Mythology", "The Mahabharata is retold through the voice and experiences of Draupadi.", 399, 20],
    ["The Forest of Enchantments", "Chitra Banerjee Divakaruni", "Indian Mythology", "A retelling of the Ramayana that gives Sita's journey and choices the foreground.", 399, 18],
    ["The Krishna Key", "Ashwin Sanghi", "Indian Mythology", "A contemporary mystery follows a historian investigating a trail connected to Krishna.", 399, 16],
    ["Ram: Scion of Ikshvaku", "Amish Tripathi", "Indian Mythology", "The first Ram Chandra novel presents an imaginative account of Rama's early life and duty.", 399, 20],
    ["Sita: Warrior of Mithila", "Amish Tripathi", "Indian Mythology", "The second Ram Chandra novel follows Sita's rise as a leader and warrior.", 399, 18],
    ["The Bhagavad Gita", "Translated by Eknath Easwaran", "Indian Mythology", "A credited English translation of the dialogue on duty, action, and spiritual insight from the Bhagavad Gita.", 299, 24],

    ["The Guide", "R. K. Narayan", "Indian Literature", "A railway guide's life changes as he becomes entangled in the ambitions and expectations of a village.", 299, 18],
    ["Malgudi Days", "R. K. Narayan", "Indian Literature", "Stories of memorable people and everyday events in the fictional South Indian town of Malgudi.", 349, 20],
    ["Swami and Friends", "R. K. Narayan", "Indian Literature", "A gently comic novel following schoolboy Swami and his friends in Malgudi.", 299, 18],
    ["The God of Small Things", "Arundhati Roy", "Indian Literature", "A family story in Kerala explores memory, belonging, and the consequences of social boundaries.", 399, 16],
    ["Train to Pakistan", "Khushwant Singh", "Indian Literature", "A village on the Punjab border confronts the human cost of Partition.", 299, 20],
    ["The White Tiger", "Aravind Adiga", "Indian Literature", "An ambitious driver writes a candid account of class, opportunity, and modern India.", 349, 18],
    ["A Suitable Boy", "Vikram Seth", "Indian Literature", "A wide-ranging family saga follows a young woman's search for a husband in post-independence India.", 699, 10],
    ["The Namesake", "Jhumpa Lahiri", "Indian Literature", "A Bengali-American family navigates identity, migration, and the meaning carried by a name.", 349, 16],
    ["Midnight's Children", "Salman Rushdie", "Indian Literature", "A boy born at the moment of India's independence finds his life entangled with the nation's story.", 499, 14],
    ["The Blue Umbrella", "Ruskin Bond", "Indian Literature", "In a Himalayan village, a bright blue umbrella changes the fortunes and feelings of its owner and a shopkeeper.", 199, 24],
    ["The Room on the Roof", "Ruskin Bond", "Indian Literature", "A teenager seeks independence and friendship in the hill town of Dehradun.", 249, 20],
    ["The Inheritance of Loss", "Kiran Desai", "Indian Literature", "Lives in the Himalayas and New York intersect in a novel about migration, family, and belonging.", 399, 16],
    ["The English Teacher", "R. K. Narayan", "Indian Literature", "A teacher in Malgudi faces grief and searches for meaning, connection, and renewal.", 299, 18],
    ["Untouchable", "Mulk Raj Anand", "Indian Literature", "One day in the life of a young sanitation worker exposes the cruelty of caste discrimination.", 249, 18],
    ["Coolie", "Mulk Raj Anand", "Indian Literature", "A boy's search for work reveals the exploitation and hardship faced by the poor in colonial India.", 249, 18],

    ["Wings of Fire", "A. P. J. Abdul Kalam and Arun Tiwari", "Self-Help and Biography", "A. P. J. Abdul Kalam recounts his childhood, scientific work, and public-service journey.", 349, 24],
    ["Ignited Minds", "A. P. J. Abdul Kalam", "Self-Help and Biography", "Kalam shares reflections on education, confidence, and the potential of India's young people.", 299, 22],
    ["My Journey", "A. P. J. Abdul Kalam", "Self-Help and Biography", "Short autobiographical episodes trace lessons from Kalam's life and career.", 249, 20],
    ["India 2020", "A. P. J. Abdul Kalam and Y. S. Rajan", "Self-Help and Biography", "A development vision for India considers science, technology, and national priorities.", 349, 18],
    ["The Story of My Experiments with Truth", "Mahatma Gandhi", "Self-Help and Biography", "Gandhi's autobiography reflects on formative experiences and his pursuit of truth.", 399, 18],
    ["You Can Win", "Shiv Khera", "Self-Help and Biography", "A motivational guide on goals, attitudes, and personal effectiveness.", 299, 24],
    ["Stay Hungry Stay Foolish", "Rashmi Bansal", "Self-Help and Biography", "Entrepreneurs from Indian business schools describe the choices behind their ventures.", 349, 18],
    ["The 3 Mistakes of My Life", "Chetan Bhagat", "Self-Help and Biography", "Three friends navigate business, sport, and faith amid social and political upheaval in Gujarat.", 299, 20],
    ["Five Point Someone", "Chetan Bhagat", "Self-Help and Biography", "Three engineering students challenge academic pressure and friendship at an Indian college.", 299, 20],
    ["Making India Awesome", "Chetan Bhagat", "Self-Help and Biography", "Essays discuss civic and social issues and propose ways to improve public life in India.", 299, 18],
    ["Life's Amazing Secrets", "Gaur Gopal Das", "Self-Help and Biography", "A mentor uses everyday conversations to discuss relationships, work, and personal growth.", 349, 22],
    ["Do Epic Shit", "Ankur Warikoo", "Self-Help and Biography", "Short reflections and exercises address habits, work, money, and self-awareness.", 399, 22],
    ["Get Epic Shit Done", "Ankur Warikoo", "Self-Help and Biography", "A practical collection of prompts and ideas for turning intentions into daily action.", 399, 20],
    ["Think Like a Monk", "Jay Shetty", "Self-Help and Biography", "Shetty draws on monastic practice to explore purpose, focus, and compassionate living.", 399, 20],

    ["India After Gandhi", "Ramachandra Guha", "History and Biography", "A detailed history of India from independence through the challenges of its modern democracy.", 699, 12],
    ["The Discovery of India", "Jawaharlal Nehru", "History and Biography", "Written during imprisonment, Nehru reflects on India's history, culture, and political future.", 499, 16],
    ["Annihilation of Caste", "B. R. Ambedkar", "History and Biography", "Ambedkar's influential critique examines caste and argues for its abolition.", 199, 24],
    ["The Argumentative Indian", "Amartya Sen", "History and Biography", "Essays consider India's traditions of debate, pluralism, and public reasoning.", 399, 18],
    ["The Man Who Knew Infinity", "Robert Kanigel", "History and Biography", "A biography of Srinivasa Ramanujan and his mathematical life in India and England.", 399, 18]
].map(([title, author, category, description, price, stock]) => ({
    title,
    author,
    category,
    description,
    price: Number(price).toFixed(2),
    stock,
    image_url: null,
    is_active: true
}));

const categories = [
    ["Marathi Literature", "Marathi novels, memoirs, and literary classics"],
    ["Indian Mythology", "Indian epics, mythology, and spiritual writing"],
    ["Indian Literature", "Indian novels, short stories, and fiction"],
    ["Self-Help and Biography", "Personal development, memoir, and biography"],
    ["History and Biography", "Indian history, public thought, and biography"]
];

function normalize(value) {
    return String(value)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

async function findVerifiedCover(book) {
    const query = new URLSearchParams({
        title: book.title,
        author: book.author,
        limit: "10"
    });
    const response = await fetch(`https://openlibrary.org/search.json?${query}`);
    if (!response.ok) {
        throw new Error(`Open Library search returned HTTP ${response.status}`);
    }

    const result = await response.json();
    const wantedTitle = normalize(book.title);
    const wantedAuthor = normalize(book.author.replace(/^Translated by /i, ""));
    const match = (result.docs || []).find((edition) => {
        const titleMatches = normalize(edition.title || "") === wantedTitle;
        const authorMatches = (edition.author_name || []).some((name) => {
            const actualAuthor = normalize(name);
            return actualAuthor === wantedAuthor ||
                wantedAuthor.includes(actualAuthor) ||
                actualAuthor.includes(wantedAuthor);
        });
        return titleMatches && authorMatches && Number.isSafeInteger(edition.cover_i);
    });

    if (!match) return null;
    const imageUrl = `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg?default=false`;
    const imageResponse = await fetch(imageUrl, { method: "HEAD" });
    const contentType = imageResponse.headers.get("content-type") || "";
    if (!imageResponse.ok || !contentType.toLowerCase().startsWith("image/")) {
        return null;
    }
    return imageUrl;
}

async function seedBooks() {
    if (catalog.length < 50) {
        throw new Error(`Seed catalog has only ${catalog.length} titles; at least 50 are required.`);
    }
    const uniqueBooks = new Set(catalog.map((book) => normalize(book.title)));
    if (uniqueBooks.size !== catalog.length) {
        throw new Error("Seed catalog contains duplicate normalized titles.");
    }

    const connection = await pool.getConnection();
    let lockAcquired = false;
    let transactionStarted = false;
    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const unverifiedImages = [];

    try {
        const [lockRows] = await connection.execute(
            "SELECT GET_LOCK(?, 10) AS lock_acquired",
            ["bookhub_indian_books_seed_v1"]
        );
        if (lockRows[0].lock_acquired !== 1) {
            throw new Error("Could not acquire the BookHub seed lock; no books were changed.");
        }
        lockAcquired = true;

        await connection.beginTransaction();
        transactionStarted = true;

        for (const [name, description] of categories) {
            await connection.execute(
                `INSERT INTO categories (category_name, description)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE category_id = LAST_INSERT_ID(category_id)`,
                [name, description]
            );
        }

        const [categoryRows] = await connection.execute(
            "SELECT category_id, category_name FROM categories"
        );
        const categoryIds = new Map(
            categoryRows.map((category) => [normalize(category.category_name), category.category_id])
        );
        const [existingRows] = await connection.execute(
            "SELECT title, author FROM books FOR UPDATE"
        );
        const existing = new Set(
            existingRows.map((book) => `${normalize(book.title)}:${normalize(book.author)}`)
        );

        for (const book of catalog) {
            const key = `${normalize(book.title)}:${normalize(book.author)}`;
            if (existing.has(key)) {
                skipped += 1;
                console.log(`Skipped existing: ${book.title} — ${book.author}`);
                continue;
            }

            const categoryId = categoryIds.get(normalize(book.category));
            if (!categoryId) {
                failed += 1;
                console.error(`Failed: ${book.title} — category not found: ${book.category}`);
                continue;
            }

            try {
                book.image_url = await findVerifiedCover(book);
            } catch (error) {
                book.image_url = null;
                console.warn(`Cover not verified for "${book.title}": ${error.message}`);
            }
            if (!book.image_url) {
                unverifiedImages.push(book.title);
            }

            try {
                await connection.execute(
                    `INSERT INTO books
                        (title, author, description, category_id, price, stock, image_url, is_active)
                     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
                    [
                        book.title,
                        book.author,
                        book.description,
                        categoryId,
                        book.price,
                        book.stock,
                        book.image_url
                    ]
                );
                inserted += 1;
                existing.add(key);
                console.log(`Inserted: ${book.title}${book.image_url ? " (cover verified)" : " (no verified cover)"}`);
            } catch (error) {
                failed += 1;
                console.error(`Failed to insert "${book.title}": ${error.message}`);
            }
        }

        await connection.commit();
        transactionStarted = false;
        console.log(`\nSummary: inserted=${inserted}, skipped=${skipped}, failed=${failed}, catalog=${catalog.length}`);
        console.log(`Unverified covers (${unverifiedImages.length}): ${unverifiedImages.join("; ") || "none"}`);
        console.log(`All inserted books are assigned to an existing category and marked active.`);
        if (failed > 0) process.exitCode = 1;
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        throw error;
    } finally {
        if (lockAcquired) {
            await connection.execute("SELECT RELEASE_LOCK(?)", ["bookhub_indian_books_seed_v1"]);
        }
        connection.release();
    }
}

seedBooks()
    .catch((error) => {
        console.error(`Indian book seed failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
