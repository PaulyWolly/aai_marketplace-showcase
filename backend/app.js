const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const appraisalRoutes = require('./routes/appraisal.routes');
const adminRoutes = require('./routes/admin.routes');
const itemRoutes = require('./routes/item.routes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appraisals', appraisalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/items', itemRoutes);

// Display OpenAI configuration
if (process.env.OPENAI_API_KEY) {
  const maskedKey = process.env.OPENAI_API_KEY.substring(0, 5) + '...' + process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 5);
  console.log('Using API key (masked):', maskedKey);
  console.log('Using model:', process.env.OPENAI_MODEL || 'gpt-4o');
  console.log('OpenAI service initialized successfully');
}

// Connect to MongoDB with detailed logging
console.log('Attempting to connect to MongoDB...');
// Mask sensitive parts of the connection string for logging
const maskedMongoURI = config.mongoURI.replace(
  /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
  'mongodb$1://$2:***@'
);
console.log('MongoDB URI:', maskedMongoURI);

// Extract database name from connection string
const dbName = config.mongoURI.split('/').pop().split('?')[0];
console.log('Database name:', dbName);

mongoose.connect(config.mongoURI)
  .then((conn) => {
    console.log('Connected to MongoDB successfully');
    console.log('MongoDB server:', conn.connection.host);
    console.log('Database name:', conn.connection.name);
    console.log('MongoDB version:', conn.version);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;