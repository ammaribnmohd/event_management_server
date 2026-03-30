const mongoose = require("mongoose");
const env = require("./env");

async function connectDatabase() {
  await mongoose.connect(env.mongoUri);
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = {
  mongoose,
  connectDatabase,
  disconnectDatabase,
};
