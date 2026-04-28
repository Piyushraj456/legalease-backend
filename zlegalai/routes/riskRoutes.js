const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const riskController = require("../controllers/riskController");


router.post("/", authenticate, riskController.analyzeDocumentRisk);

module.exports = router;
