const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const clauseController = require("../controllers/clauseController");


router.get("/", authenticate, clauseController.getClauses);

module.exports = router;
