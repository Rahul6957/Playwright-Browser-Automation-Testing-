const express = require("express");
const orderController = require("../controllers/orderController");
const { authenticate } = require("../auth");

const router = express.Router();

router.use(authenticate);
router.post("/", (req, res) => orderController.createOrder(req, res));
router.get("/", (req, res) => orderController.listOrders(req, res));
router.get("/checkout-preview", (req, res) => orderController.checkoutPreview(req, res));
router.post("/:id/payment", (req, res) => orderController.createPayment(req, res));
router.post("/:id/payment/verify", (req, res) => orderController.verifyPayment(req, res));
router.get("/:id/items", (req, res) => orderController.getItems(req, res));
router.put("/:id/cancel", (req, res) => orderController.cancelOrder(req, res));
router.get("/:id", (req, res) => orderController.getOrder(req, res));

module.exports = router;
