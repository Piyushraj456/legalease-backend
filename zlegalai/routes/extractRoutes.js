const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const extractController = require("../controllers/extractController");


router.post("/", authenticate, extractController.extractText);

module.exports = router;
