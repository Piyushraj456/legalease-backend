const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");
const cors = require("cors");

const authRoutes = require("./routes/authRoute");
const uploadRoutes = require("./routes/uploadRoutes");
const documentRoutes = require("./routes/documentRoutes");
const extractRoutes = require("./routes/extractRoutes");
const summaryRoutes = require("./routes/summaryRoutes");
const clauseRoutes = require("./routes/clauseRoutes");
const riskRoutes = require("./routes/riskRoutes");

const app = express();

dotenv.config();

connectDB();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5000","https://fyp-mu-lilac.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/extract", extractRoutes);
app.use("/api/summarize", summaryRoutes);
app.use("/api/clauses", clauseRoutes);
app.use("/api/risks", riskRoutes);

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
