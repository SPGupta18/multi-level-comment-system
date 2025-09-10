// tests/test-setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function startInMemoryMongo() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: "testdb" });
  return uri;
}

async function stopInMemoryMongo() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

module.exports = {
  startInMemoryMongo,
  stopInMemoryMongo,
};
