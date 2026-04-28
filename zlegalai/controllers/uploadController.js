const { deleteFile } = require("../services/uploadService");
const Document = require("../models/Document");


const saveDocument = async (req, res, next) => {
  try {
    const { title, fileUrl, originalName, size, fileKey } = req.body;

    if (!title || !fileUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "Title and file URL are required" 
      });
    }

    const document = new Document({
      title,
      fileUrl,
      originalName: originalName || title,
      size: size || 0,
      fileKey: fileKey || '',
      uploadedBy: req.user._id,
    });

    await document.save();

    res.status(201).json({
      success: true,
      message: "Document saved successfully",
      document: {
        _id: document._id,
        title: document.title,
        fileUrl: document.fileUrl,
        originalName: document.originalName,
        size: document.size,
        createdAt: document.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};


const removeUpload = async (req, res, next) => {
  try {
    const { fileKey } = req.body;

    if (!fileKey) {
      return res.status(400).json({ success: false, message: "File key is required" });
    }

  
    await deleteFile(fileKey);

  
    await Document.findOneAndDelete({
      fileKey,
      uploadedBy: req.user._id,
    });

    res.json({ success: true, message: "File deleted successfully" });
  } catch (err) {
    next(err);
  }
};


const getMyFiles = async (req, res, next) => {
  try {
    const docs = await Document.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: docs.length,
      files: docs,
    });
  } catch (err) {
    next(err);
  }
};


const getFileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await Document.findOne({
      _id: id,
      uploadedBy: req.user._id,
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    res.json({
      success: true,
      file: doc,
    });
  } catch (err) {
    next(err);
  }
};

const testUploadThing = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: "UploadThing service is ready",
      endpoints: {
        upload: "/api/upload/uploadthing/pdfUploader",
        delete: "/api/upload/remove",
        list: "/api/upload/files",
        save: "/api/upload/save-document"
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  saveDocument,
  removeUpload,
  getMyFiles,
  getFileById,
  testUploadThing
};