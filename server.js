require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;

// middlewares
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
