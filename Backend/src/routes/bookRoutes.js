const express = require("express");
const bookController = require("../controllers/bookController");
const { authenticate, requireAdmin } = require("../auth");

const router = express.Router();

router.get("/", (req, res) =>
    bookController.getAllBooks(req, res)
);

router.get("/:id", (req, res) =>
    bookController.getBookById(req, res)
);

router.post("/", authenticate, requireAdmin, (req, res) =>
    bookController.createBook(req, res)
);
router.put("/:id", authenticate, requireAdmin, (req, res) =>
    bookController.updateBook(req, res)
);
router.delete("/:id", authenticate, requireAdmin, (req, res) =>
    bookController.deleteBook(req, res)
);
module.exports = router;