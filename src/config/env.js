const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri:
    process.env.MONGO_URI || process.env.DB_URI || "mongodb://127.0.0.1:27017/event_management",
  jwtSecret: process.env.JWT_SECRET || "change_this_secret",
  clientUrl: process.env.CLIENT_URL || "http://localhost:4200",
};

module.exports = env;
