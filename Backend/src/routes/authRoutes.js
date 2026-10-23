const express = require("express");
const authController = require("../controllers/authController");
const { authenticate } = require("../auth");

const router = express.Router();

router.post("/register", (req, res) =>
authController.register(req, res)
);

router.post("/login", (req, res) =>
authController.login(req, res)
);

router.get("/profile", authenticate, (req, res) =>
authController.profile(req, res)
);

module.exports = router;
