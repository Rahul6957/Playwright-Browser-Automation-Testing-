const express = require("express");
const categoryController = require("../controllers/categoryController");
const { authenticate, requireAdmin } = require("../auth");

const router = express.Router();

router.get("/", (req, res) =>
    categoryController.getAllCategories(req, res)
);

router.get("/:id", (req, res) =>
    categoryController.getCategoryById(req, res)
);

router.post("/", authenticate, requireAdmin, (req, res) =>
    categoryController.createCategory(req, res)
);

router.put("/:id", authenticate, requireAdmin, (req, res) =>
    categoryController.updateCategory(req, res)
);

router.delete("/:id", authenticate, requireAdmin, (req, res) =>
    categoryController.deleteCategory(req, res)
);

module.exports = router;