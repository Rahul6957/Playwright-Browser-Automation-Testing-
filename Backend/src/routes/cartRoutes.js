const express = require("express");
const cartController = require("../controllers/cartController");
const { authenticate } = require("../auth");

const router = express.Router();

router.use(authenticate);
router.post("/", (req, res) => cartController.addItem(req, res));
router.get("/", (req, res) => cartController.getCart(req, res));
router.put("/:bookId", (req, res) => cartController.updateItem(req, res));
router.delete("/:bookId", (req, res) => cartController.deleteItem(req, res));
router.delete("/", (req, res) => cartController.clearCart(req, res));

module.exports = router;
