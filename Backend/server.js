const pool = require("./src/config/db");
const app = require("./src/app");
const PORT = 5000;

async function startServer() {
let connection;
try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log("MySQL Connected Successfully");
} catch (error) {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
    return;
} finally {
    if (connection) {
        connection.release();
    }
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

}

startServer();
