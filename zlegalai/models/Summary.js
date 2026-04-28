const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      unique: true 
    },

    pythonDocId: { type: String }, 

    executiveSummary: { type: String }, 

    clauseSummaries: [{
      clauseId: String,
      category: String,
      importance: Number,
      keyPoints: [String],
      summary: String,
      page: Number
    }],

    summaryMetadata: {
      totalClauses: Number,
      summarizedClauses: Number,
      generatedAt: Date,
      llmUsed: Boolean,
      fallbackUsed: Boolean,
      selectedCount: Number,
      clauseSelection: String,
      selectedIds: [String],
      llmError: String
    },

    extractionResults: {
      totalClausesAnalyzed: Number,
      returnedClauses: Number,
      highImportanceClauses: Number,
      categoriesDetected: Number,
      pageCount: Number
    },

    topClauses: [{
      clauseId: String,
      text: String,
      category: String,
      keywords: [String],
      importanceScore: Number,
      scoreExplanation: [String],
      pageNumber: Number,
      positionType: String,
      extractedEntities: mongoose.Schema.Types.Mixed
    }],

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending"
    },

    errorMessage: String,

    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);


summarySchema.index({ documentId: 1 });
summarySchema.index({ pythonDocId: 1 });
summarySchema.index({ status: 1 });
summarySchema.index({ createdAt: -1 });


summarySchema.methods.isStale = function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.updatedAt < oneDayAgo;
};


summarySchema.statics.findByDocumentId = function (documentId) {
  return this.findOne({ documentId }).populate("documentId");
};

summarySchema.statics.findRecentForUser = function (userId, limit = 10) {
  return this.find()
    .populate({
      path: "documentId",
      match: { uploadedBy: userId },
      select: "title originalName fileUrl size createdAt"
    })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model("Summary", summarySchema);
