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

// Connect to MongoDB with retry logic
async function connectToMongoDB(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.info('Connected to MongoDB');
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        logger.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Failed to connect to MongoDB after multiple attempts');
}

// Routes
app.use('/api/ml', mlRoutes);
app.use('/api/data', dataRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  // Handle TensorFlow.js specific errors
  if (err.message && err.message.includes('tf.')) {
    return res.status(500).json({
      error: 'ML model error',
      message: 'An error occurred while processing the machine learning model',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.errors : undefined
    });
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(503).json({
      error: 'Database error',
      message: 'A database error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Process error handling
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  // Attempt to clean up resources
  cleanup()
    .then(() => process.exit(1))
    .catch((cleanupErr) => {
      logger.error('Error during cleanup:', cleanupErr);
      process.exit(1);
    });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Attempt to clean up resources
  cleanup()
    .then(() => process.exit(1))
    .catch((cleanupErr) => {
      logger.error('Error during cleanup:', cleanupErr);
      process.exit(1);
    });
});

// Cleanup function
async function cleanup() {
  logger.info('Starting cleanup...');
  try {
    // Dispose of TensorFlow.js resources
    if (global.tf) {
      await tf.disposeVariables();
    }

    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('Closed MongoDB connection');
    }

    // Close server
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error('Error closing server:', err);
            reject(err);
          } else {
            logger.info('Closed server');
            resolve();
          }
        });
      });
    }
  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal');
  cleanup()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Error during SIGTERM cleanup:', err);
      process.exit(1);
    });
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal');
  cleanup()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Error during SIGINT cleanup:', err);
      process.exit(1);
    });
});

const PORT = process.env.PORT || 3000;
let server = null;

// Initialize server with async setup
async function initializeServer() {
  try {
    // Ensure MongoDB is connected before starting the server
    await connectToMongoDB();
    
    // Start server only after successful MongoDB connection
    startServer();
  } catch (error) {
    logger.error('Server initialization failed:', error);
    process.exit(1);
  }
}

// Update startServer function
function startServer() {
  if (server) {
    logger.warn('Server already running, closing existing server...');
    server.close(() => {
      logger.info('Existing server closed');
    });
  }
  
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        resolve(server);
      });

      // Handle server errors
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${PORT} is already in use. Trying to close existing connection...`);
          // Try to close any existing connection
          require('child_process').exec(`npx kill-port ${PORT}`, async (err) => {
            if (err) {
              logger.error('Failed to kill existing process:', err);
              reject(err);
            } else {
              logger.info('Successfully killed existing process');
              // Wait a moment before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
              // Retry starting the server
              startServer().then(resolve).catch(reject);
            }
          });
        } else {
          logger.error('Server error:', error);
          reject(error);
        }
      });

      // Handle server startup timeout
      const startupTimeout = setTimeout(() => {
        reject(new Error('Server startup timed out'));
      }, 30000);

      server.once('listening', () => {
        clearTimeout(startupTimeout);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Initialize the server
initializeServer().catch(error => {
  logger.error('Fatal error during server initialization:', error);
  process.exit(1);
}); 