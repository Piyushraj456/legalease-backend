const axios = require("axios");

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "https://legaleasepy.onrender.com";

const pythonApi = axios.create({
  baseURL: PYTHON_API_URL,
  timeout: 120000,
  headers: { "Content-Type": "application/json" },
});

pythonApi.interceptors.request.use(
  (config) => {
    console.log(
      `➡️  ${config.method.toUpperCase()} ${config.baseURL}${config.url}`
    );
    if (config.params) console.log("   Params:", config.params);
    if (config.data) console.log("   Body:", config.data);
    return config;
  },
  (error) => {
    console.error("❌ Request setup error:", error.message);
    return Promise.reject(error);
  }
);

pythonApi.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.config.method.toUpperCase()} ${response.config.url} - ${
        response.status
      }`
    );
    return response;
  },
  (error) => {
    console.error("❌ Python API Error");
    console.error("   URL:", error.config?.url);
    console.error("   Method:", error.config?.method?.toUpperCase());
    console.error("   BaseURL:", error.config?.baseURL);

    if (error.code === "ECONNREFUSED") {
      console.error("🔥 FastAPI is not running on port 8000");
      return Promise.reject(
        new Error("FastAPI server is offline. Start it first.")
      );
    }

    if (error.code === "ECONNABORTED") {
      console.error("⏰ Request timed out (2 min)");
      return Promise.reject(
        new Error("Request timeout - PDF too large or slow to process.")
      );
    }

    return Promise.reject(error);
  }
);

async function extractDocument(
  fileUrl,
  category = null,
  minScore = 5,
  maxResults = 50
) {
  try {
    const response = await pythonApi.post(
      "/extract",
      { file_url: fileUrl },
      { params: { category, min_score: minScore, max_results: maxResults } }
    );
    return response.data;
  } catch (error) {
    handleApiError("extractDocument", error);
  }
}

async function summarizeDocument(pythonDocId, fileUrl = null) {
  try {
    if (pythonDocId) {
      try {
        const res = await pythonApi.post("/summarize", null, {
          params: { document_id: pythonDocId },
        });
        return res.data;
      } catch (err) {
        if (err.response?.status !== 404 || !fileUrl) throw err;
        console.log("⚠️  Falling back to file_url for summarization...");
      }
    }

    if (fileUrl) {
      const res = await pythonApi.post("/summarize", null, {
        params: { file_url: fileUrl },
      });
      return res.data;
    }

    throw new Error("Summarization requires pythonDocId or fileUrl.");
  } catch (error) {
    handleApiError("summarizeDocument", error);
  }
}

async function analyzeRisk(pythonDocId, fileUrl = null) {
  try {
    const response = await pythonApi.post("/risk", null, {
      params: { document_id: pythonDocId },
    });
    return response.data;
  } catch (error) {
    // If Python lost the doc (Render restart wiped memory), re-extract then retry
    if (error.response?.status === 404 && fileUrl) {
      console.log("⚠️ analyzeRisk: doc not found in Python, re-extracting...");
      const reExtracted = await extractDocument(fileUrl, null, 3, 50);
      const newDocId = reExtracted?.document_id;
      if (!newDocId) throw new Error("Re-extraction failed: no document_id returned");
      const retry = await pythonApi.post("/risk", null, {
        params: { document_id: newDocId },
      });
      return { ...retry.data, _reExtractedDocId: newDocId };
    }
    handleApiError("analyzeRisk", error);
  }
}

async function fetchClauses(
  pythonDocId,
  { category, query, min_score = 5, limit = 50 } = {}
) {
  try {
    const response = await pythonApi.get("/clauses", {
      params: { document_id: pythonDocId, category, query, min_score, limit },
    });
    return response.data;
  } catch (error) {
    handleApiError("fetchClauses", error);
  }
}

function handleApiError(fnName, error) {
  console.error(`💥 ${fnName} failed`);
  if (error.response) {
    console.error("   Status:", error.response.status);
    console.error("   Data:", error.response.data);
  } else if (error.request) {
    console.error("   No response received. Request:", error.request);
  } else {
    console.error("   Error:", error.message);
  }
  throw new Error(
    `Python API ${fnName} error: ${
      error.response?.data?.detail || error.message
    }`
  );
}

module.exports = {
  extractDocument,
  summarizeDocument,
  analyzeRisk,
  fetchClauses,

  pythonApi,
};
