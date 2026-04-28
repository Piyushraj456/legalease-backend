const Document = require("../models/Document");


const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (err) {
    next(err);
  }
};


const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findOne({
      _id: id,
      uploadedBy: req.user._id, 
    });

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
};


const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findOneAndDelete({
      _id: id,
      uploadedBy: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDocuments,
  getDocumentById,
  deleteDocument,
};
