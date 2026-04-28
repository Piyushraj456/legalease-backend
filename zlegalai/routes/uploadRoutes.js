const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const uploadController = require("../controllers/uploadController");
const { uploadthingHandler } = require("../services/uploadService");


router.use("/uploadthing", uploadthingHandler);


router.post("/save-document", authenticate, uploadController.saveDocument);


router.delete("/remove", authenticate, uploadController.removeUpload);


router.get("/files", authenticate, uploadController.getMyFiles);


router.get("/files/:id", authenticate, uploadController.getFileById);


router.get("/test", uploadController.testUploadThing);

module.exports = router;
