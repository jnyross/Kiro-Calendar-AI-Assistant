const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Basic API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Kiro Calendar Assistant is running',
    timestamp: new Date().toISOString()
  });
});

// Serve the main app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Kiro Calendar Assistant is running at http://localhost:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
});