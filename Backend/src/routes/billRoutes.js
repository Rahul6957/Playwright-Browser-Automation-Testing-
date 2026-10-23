const express = require("express");
const billController = require("../controllers/billController");
const { authenticate } = require("../auth");

const router = express.Router();

router.use(authenticate);
router.get("/:orderId/download", (req, res) => billController.downloadBill(req, res));
router.get("/:orderId", (req, res) => billController.getBill(req, res));

module.exports = router;
