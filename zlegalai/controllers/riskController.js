const pythonApiService = require("../services/pythonApiService");
const Document = require("../models/Document");


const analyzeDocumentRisk = async (req, res, next) => {
  try {
    const { documentId } = req.body;

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

   
    const response = await pythonApiService.post("/risk", {
      document_id: document.pythonDocId,
    });

    res.json({
      success: true,
      documentId,
      pythonDocId: document.pythonDocId,
      risk: response.data.risk_summary,
      details: response.data.risk_analysis,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { analyzeDocumentRisk };
