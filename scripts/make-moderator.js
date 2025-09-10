require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

async function run() {
  await connectDB(process.env.MONGO_URI);
  const u = await User.findOneAndUpdate({ username: 'bob' }, { role: 'moderator' }, { new: true });
  console.log('Updated user:', u);
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
