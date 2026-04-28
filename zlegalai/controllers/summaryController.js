const pythonApiService = require("../services/pythonApiService");
const Document = require("../models/Document");
const Summary = require("../models/Summary");


const summarizeDocument = async (req, res, next) => {
  console.log("=== SUMMARY REQUEST START ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  console.log("User ID:", req.user?._id);
  
  try {
    const { documentId, forceRegenerate = false } = req.body;
    
    if (!documentId) {
      console.log("ERROR: No documentId provided");
      return res.status(400).json({ 
        success: false, 
        message: "documentId is required" 
      });
    }

    console.log("Looking for MongoDB document:", documentId);
    
    const document = await Document.findOne({
      _id: documentId,
      uploadedBy: req.user._id,
    });

    console.log("MongoDB document found:", !!document);
    
    if (!document) {
      console.log("ERROR: Document not found in MongoDB");
      return res.status(404).json({ 
        success: false, 
        message: "Document not found" 
      });
    }


    let summaryRecord = await Summary.findByDocumentId(documentId);
    
    if (summaryRecord && summaryRecord.status === 'completed' && !forceRegenerate) {
      console.log("Found existing summary in database");
      
  
      if (summaryRecord.isStale()) {
        console.log("Summary is stale, will regenerate");
      } else {
        console.log("Using cached summary from database");
        return res.json({
          success: true,
          documentId,
          pythonDocId: summaryRecord.pythonDocId,
          summary: summaryRecord.executiveSummary,
          clauses: summaryRecord.clauseSummaries || [],
          metadata: summaryRecord.summaryMetadata || {},
          extractionResults: summaryRecord.extractionResults || {},
          generatedAt: summaryRecord.updatedAt.toISOString(),
          fromCache: true,
          summaryId: summaryRecord._id
        });
      }
    }

  
    console.log("Need to generate new summary");

 
    if (!document.pythonDocId) {
      console.log("Document not extracted yet, running extraction first");
      
      try {
     
        const extractResult = await pythonApiService.extractDocument(
          document.fileUrl,
          null, 
          3,   
          50  
        );
        
        console.log("Auto-extraction successful");
        
        if (extractResult.document_id) {
          document.pythonDocId = extractResult.document_id;
          await document.save();
          console.log("Updated document with pythonDocId");
        }
        
      } catch (extractError) {
        console.error("Auto-extraction failed:", extractError.message);
        return res.status(400).json({ 
          success: false, 
          message: "Document not extracted yet and auto-extraction failed", 
          needsExtraction: true,
          extractError: extractError.message
        });
      }
    }

  
    console.log("Generating summary via FastAPI");
    
   
    if (!summaryRecord) {
      summaryRecord = new Summary({
        documentId: document._id,
        pythonDocId: document.pythonDocId,
        executiveSummary: 'Processing...',
        status: 'processing'
      });
    } else {
      summaryRecord.status = 'processing';
      summaryRecord.version += 1;
      summaryRecord.errorMessage = undefined;
    }
    
    await summaryRecord.save();

    try {
      const summaryResponse = await pythonApiService.summarizeDocument(
        document.pythonDocId,
        document.fileUrl
      );
      
      console.log("FastAPI summarize successful");

    
      summaryRecord.executiveSummary = summaryResponse.executive_summary || "Summary not available";
      summaryRecord.clauseSummaries = (summaryResponse.clause_summaries || []).map(clause => ({
        clauseId: clause.clause_id,
        category: clause.category,
        importance: clause.importance,
        keyPoints: clause.key_points || [],
        summary: clause.summary,
        page: clause.page
      }));

      summaryRecord.summaryMetadata = {
        totalClauses: summaryResponse.summary_metadata?.total_clauses || 0,
        summarizedClauses: summaryResponse.summary_metadata?.summarized_clauses || 0,
        generatedAt: new Date(summaryResponse.summary_metadata?.generated_at) || new Date(),
        llmUsed: summaryResponse.summary_metadata?.llm_used || false,
        fallbackUsed: summaryResponse.summary_metadata?.fallback_used || false,
        selectedCount: summaryResponse.summary_metadata?.selected_count || 0,
        clauseSelection: summaryResponse.summary_metadata?.clause_selection || '',
        selectedIds: summaryResponse.summary_metadata?.selected_ids || [],
        llmError: summaryResponse.summary_metadata?.llm_error
      };

      summaryRecord.status = 'completed';
      await summaryRecord.save();

      console.log("Summary saved to database");

      const responseData = {
        success: true,
        documentId,
        pythonDocId: summaryRecord.pythonDocId,
        summary: summaryRecord.executiveSummary,
        clauses: summaryRecord.clauseSummaries,
        metadata: summaryRecord.summaryMetadata,
        generatedAt: summaryRecord.updatedAt.toISOString(),
        fromCache: false,
        regenerated: forceRegenerate || summaryRecord.version > 1,
        summaryId: summaryRecord._id
      };

      res.json(responseData);

    } catch (apiError) {
      console.error("Summary generation failed:", apiError.message);
      
      summaryRecord.status = 'failed';
      summaryRecord.errorMessage = apiError.message;
      await summaryRecord.save();

      res.status(500).json({
        success: false,
        message: "Summary generation failed",
        error: apiError.message,
        summaryId: summaryRecord._id
      });
    }

  } catch (err) {
    console.error("UNCAUGHT ERROR:", err.message);
    console.error("Stack:", err.stack);
    
    res.status(500).json({
      success: false,
      message: "Internal server error during summarization",
      error: process.env.NODE_ENV === 'development' ? err.message : "An unexpected error occurred",
    });
  }
};


const getSummaryHistory = async (req, res, next) => {
  try {
    const { limit = 10, status = null } = req.query;
    
    const summaries = await Summary.findRecentForUser(req.user._id, parseInt(limit));
    
  
    const filteredSummaries = status 
      ? summaries.filter(s => s.status === status)
      : summaries;

    const summaryHistory = filteredSummaries
      .filter(s => s.documentId) 
      .map(summary => ({
        summaryId: summary._id,
        documentId: summary.documentId._id,
        title: summary.documentId.title,
        originalName: summary.documentId.originalName,
        fileUrl: summary.documentId.fileUrl,
        size: summary.documentId.size,
        uploadedAt: summary.documentId.createdAt,
        summaryStatus: summary.status,
        summaryCreatedAt: summary.createdAt,
        summaryUpdatedAt: summary.updatedAt,
        version: summary.version,
        isStale: summary.isStale(),
        extractionResults: summary.extractionResults,
        llmUsed: summary.summaryMetadata?.llmUsed || false
      }));

    res.json({
      success: true,
      count: summaryHistory.length,
      summaries: summaryHistory
    });

  } catch (error) {
    console.error("Error fetching summary history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch summary history",
      error: error.message
    });
  }
};


const deleteSummary = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { regenerate = false } = req.body;
    
    const summary = await Summary.findOne({ documentId });
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Summary not found"
      });
    }

  
    const document = await Document.findOne({
      _id: documentId,
      uploadedBy: req.user._id
    });

    if (!document) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await Summary.findByIdAndDelete(summary._id);

    if (regenerate) {
    
      return summarizeDocument(req, res, next);
    }

    res.json({
      success: true,
      message: "Summary deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete summary",
      error: error.message
    });
  }
};

module.exports = { 
  summarizeDocument, 
  getSummaryHistory, 
  deleteSummary 
};