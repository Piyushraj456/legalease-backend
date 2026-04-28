const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const summaryController = require("../controllers/summaryController");


router.post("/", authenticate, summaryController.summarizeDocument);


router.get("/history", authenticate, summaryController.getSummaryHistory);


router.delete("/:documentId", authenticate, summaryController.deleteSummary);


router.post("/regenerate", authenticate, (req, res, next) => {
  req.body.forceRegenerate = true;
  summaryController.summarizeDocument(req, res, next);
});

module.exports = router;