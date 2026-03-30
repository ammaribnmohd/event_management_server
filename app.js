const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const env = require("./src/config/env");
const { connectDatabase } = require("./src/config/db");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");
const authRoutes = require("./src/routes/authRoutes");
const eventRoutes = require("./src/routes/eventRoutes");

const app = express();
let databaseConnectPromise;

app.use(
  cors({
    origin: env.clientUrl,
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.use(async (_req, _res, next) => {
  try {
    if (!databaseConnectPromise) {
      databaseConnectPromise = connectDatabase();
    }

    await databaseConnectPromise;
    next();
  } catch (error) {
    databaseConnectPromise = undefined;
    next(error);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api", eventRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
