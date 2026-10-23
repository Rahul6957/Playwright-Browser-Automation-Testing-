const express = require("express");
const paymentController = require("../controllers/paymentController");

const router = express.Router();

router.get("/config", (req, res) => paymentController.configuration(req, res));
router.post("/razorpay/webhook", (req, res) => paymentController.webhook(req, res));

module.exports = router;
