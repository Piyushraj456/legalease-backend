const { fetchClauses } = require("../services/pythonApiService");
const Document = require("../models/Document");


const getClauses = async (req, res, next) => {
  try {
    const { documentId, category, query, min_score, limit } = req.query;

    if (!documentId) {
      return res.status(400).json({ success: false, message: "documentId is required" });
    }

    const document = await Document.findOne({
      _id: documentId,
      uploadedBy: req.user._id,
    });

    if (!document || !document.pythonDocId) {
      return res.status(404).json({ success: false, message: "Document not extracted yet" });
    }

  
    const result = await fetchClauses(document.pythonDocId, {
      category,
      query,
      min_score,
      limit,
    });

    res.json({
      success: true,
      documentId,
      pythonDocId: document.pythonDocId,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getClauses };
