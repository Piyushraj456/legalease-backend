
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const { MONGO_URI, DB_NAME } = process.env;

if (!MONGO_URI || !DB_NAME) {
  console.error("❌ MONGO_URI and DB_NAME must be defined in .env");
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
