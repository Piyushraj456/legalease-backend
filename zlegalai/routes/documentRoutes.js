const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const documentController = require("../controllers/documentController");

// Get all documents
router.get("/", authenticate, documentController.getDocuments);

// Get single document
router.get("/:id", authenticate, documentController.getDocumentById);

// Delete a document
router.delete("/:id", authenticate, documentController.deleteDocument);

module.exports = router;
