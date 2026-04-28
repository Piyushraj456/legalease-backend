const pythonApiService = require("../services/pythonApiService");
const Document = require("../models/Document");
const Summary = require("../models/Summary");


const extractText = async (req, res, next) => {
  try {
    const { documentId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ 
        success: false, 
        message: "documentId is required" 
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      uploadedBy: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ 
        success: false, 
        message: "Document not found" 
      });
    }

    const existingSummary = await Summary.findByDocumentId(documentId);
    if (existingSummary && existingSummary.status === 'completed' && !existingSummary.isStale()) {
      console.log("Summary already exists and is fresh, skipping processing");
      return res.json({
        success: true,
        message: "Document already processed",
        documentId: document._id,
        pythonDocId: existingSummary.pythonDocId,
        extractionResults: existingSummary.extractionResults,
        clauses: existingSummary.topClauses || [],
        alreadyProcessed: true,
        summaryId: existingSummary._id
      });
    }

    console.log("Processing document:", {
      documentId: document._id,
      filename: document.originalName,
      fileUrl: document.fileUrl,
      size: document.size
    });

   
    let summaryRecord = existingSummary;
    if (!summaryRecord) {
      summaryRecord = new Summary({
        documentId: document._id,
        pythonDocId: document.pythonDocId || 'pending',
        executiveSummary: 'Processing...',
        status: 'processing'
      });
      await summaryRecord.save();
    } else {
      summaryRecord.status = 'processing';
      summaryRecord.errorMessage = undefined;
      await summaryRecord.save();
    }

    try {
    
      console.log("Calling FastAPI extract...");
      const extractResponse = await pythonApiService.extractDocument(
        document.fileUrl,
        null, 
        3,    
        50    
      );

      console.log("FastAPI extract successful");
      const pythonDocId = extractResponse?.document_id;
      const clausesFound = extractResponse?.clauses?.length || 0;
      const pageCount = extractResponse?.page_count || 0;

      if (pythonDocId) {
        document.pythonDocId = pythonDocId;
        await document.save();
        
        summaryRecord.pythonDocId = pythonDocId;
        console.log("Updated with pythonDocId:", pythonDocId);
      }

      
      summaryRecord.extractionResults = {
        totalClausesAnalyzed: extractResponse?.key_findings?.total_clauses_analyzed || clausesFound,
        returnedClauses: clausesFound,
        highImportanceClauses: extractResponse?.key_findings?.high_importance_clauses || 0,
        categoriesDetected: extractResponse?.key_findings?.categories_detected || 0,
        pageCount: pageCount
      };

     
      summaryRecord.topClauses = (extractResponse?.clauses || []).slice(0, 20).map(clause => ({
        clauseId: clause.clause_id,
        text: clause.text,
        category: clause.category,
        keywords: clause.keywords_found || [],
        importanceScore: clause.importance_score,
        scoreExplanation: clause.score_explanation || [],
        pageNumber: clause.page_number,
        positionType: clause.position_type,
        extractedEntities: clause.extracted_entities || {}
      }));

     
      console.log("Generating summary...");
      const summaryResponse = await pythonApiService.summarizeDocument(
        pythonDocId,
        document.fileUrl
      );

      console.log("Summary generation successful");

     
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

      console.log("Summary saved to database successfully");

      const responseData = {
        success: true,
        message: "Document processed and summarized successfully",
        documentId: document._id,
        pythonDocId: pythonDocId,
        extractionResults: summaryRecord.extractionResults,
        clauses: summaryRecord.topClauses,
        summaryId: summaryRecord._id,
        summaryGenerated: true
      };

      res.json(responseData);

    } catch (apiError) {
      console.error("Processing failed:", apiError.message);
      
     
      summaryRecord.status = 'failed';
      summaryRecord.errorMessage = apiError.message;
      await summaryRecord.save();

      res.status(500).json({
        success: false,
        message: "Document processing failed",
        error: apiError.message,
        summaryId: summaryRecord._id
      });
    }

  } catch (error) {
    console.error("Extract controller error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during extraction",
      error: error.message
    });
  }
};

module.exports = { extractText };