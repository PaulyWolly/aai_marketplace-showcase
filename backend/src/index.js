const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const winston = require('winston');
const path = require('path');

// Import routes
const mlRoutes = require('./routes/mlRoutes');
const dataRoutes = require('./routes/dataRoutes');

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/ml', mlRoutes);
app.use('/api/data', dataRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
let server = null;

function startServer() {
  if (server) {
    logger.warn('Server already running, closing existing server...');
    server.close();
  }
  
  server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Trying to close existing connection...`);
      // Try to close any existing connection
      require('child_process').exec(`npx kill-port ${PORT}`, (err) => {
        if (err) {
          logger.error('Failed to kill existing process:', err);
        } else {
          logger.info('Successfully killed existing process');
          // Retry starting the server
          startServer();
        }
      });
    } else {
      logger.error('Server error:', error);
    }
  });
}

// Handle graceful shutdown
async function cleanup(signal) {
  logger.info(`Received ${signal}`);
  
  if (server) {
    const forceTimeout = setTimeout(() => {
      logger.warn('Force closing server after timeout');
      process.exit(1);
    }, 5000);

    server.close(() => {
      logger.info('Server closed');
      mongoose.connection.close(false, () => {
        logger.info('MongoDB connection closed');
        clearTimeout(forceTimeout);
        
        // Only exit on SIGTERM or SIGINT
        if (signal !== 'SIGUSR2') {
          process.exit(0);
        }
      });
    });

    // Handle ongoing connections
    server.unref();
  }
}

// Start server
startServer();

// Handle signals
process.once('SIGTERM', () => cleanup('SIGTERM'));
process.once('SIGINT', () => cleanup('SIGINT'));
process.once('SIGUSR2', () => {
  cleanup('SIGUSR2').then(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
}); 