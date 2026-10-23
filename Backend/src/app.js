const express = require("express");
const cors = require("cors");
const bookRoutes = require("./routes/bookRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const billRoutes = require("./routes/billRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json({
    verify: (req, res, buffer) => {
        if (req.originalUrl === "/api/payments/razorpay/webhook") {
            req.rawBody = Buffer.from(buffer);
        }
    }
}));

// Home route
app.get("/", (req, res) => {
res.json({
success: true,
message: "Online Book Store API is running"
});
});

// Book routes
app.use("/api/books", bookRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/payments", paymentRoutes);

// Handle invalid routes
app.use((req, res) => {
res.status(404).json({
success: false,
message: "Route not found"
});
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    if (error.type === "entity.parse.failed" || error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            success: false,
            message: "Malformed JSON request body"
        });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Request body is too large"
        });
    }
    console.error(error);
    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

module.exports = app;
