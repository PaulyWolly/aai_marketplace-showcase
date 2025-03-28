const tf = require('@tensorflow/tfjs');
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const axios = require('axios');
const ImagePreprocessingService = require('./imagePreprocessing.service');

// Initialize logger
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.simple()
  }));
}

// Configure TensorFlow.js for better memory management
tf.ENV.set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
tf.ENV.set('WEBGL_FLUSH_THRESHOLD', 0);
if (tf.ENV.get('WEBGL_VERSION') === 2) {
  tf.ENV.set('WEBGL_FORCE_F16_TEXTURES', true);
}

class MLService {
  constructor() {
    // Enable memory logging in development
    if (process.env.NODE_ENV !== 'production') {
      this.enableMemoryLogging();
    }

    // Set up model paths
    this.modelPath = path.join(__dirname, '../../models');
    
    // Create models directory if it doesn't exist
    if (!fs.existsSync(this.modelPath)) {
      fs.mkdirSync(this.modelPath, { recursive: true });
      logger.info(`Created models directory at ${this.modelPath}`);
    }
    
    // Initialize models
    this.priceModel = null;
    this.imageModel = null;
    this.embeddings = new Map();
    this.modelStatus = {
      priceModel: { 
        initialized: false, 
        lastTrained: null,
        version: '1.0.0',
        performance: {
          lastValidationLoss: null,
          lastTrainingLoss: null,
          featureImportance: null
        }
      },
      imageModel: { 
        initialized: false, 
        lastTrained: null,
        version: '1.0.0',
        performance: {
          lastValidationLoss: null,
          lastTrainingLoss: null
        }
      }
    };
    this.trainOpts = null;
    
    // Load existing models on startup
    this.loadExistingModels();

    // Set up periodic memory cleanup
    this.setupMemoryCleanup();

    this.imagePreprocessing = new ImagePreprocessingService();
  }

  // Memory management methods
  enableMemoryLogging() {
    setInterval(() => {
      const memoryInfo = tf.memory();
      logger.info('TensorFlow.js Memory Info:', {
        numTensors: memoryInfo.numTensors,
        numDataBuffers: memoryInfo.numDataBuffers,
        numBytes: memoryInfo.numBytes,
        unreliable: memoryInfo.unreliable,
        reasons: memoryInfo.reasons
      });
    }, 60000); // Log every minute
  }

  setupMemoryCleanup() {
    setInterval(() => {
      try {
        // Dispose of any unused tensors
        tf.disposeVariables();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        logger.info('Performed periodic memory cleanup');
      } catch (error) {
        logger.error('Error during memory cleanup:', error);
      }
    }, 300000); // Clean up every 5 minutes
  }

  async cleanupTensors() {
    try {
      // Dispose of any existing tensors
      tf.disposeVariables();
      
      // Clear the backend
      await tf.ready();
      tf.engine().endScope();
      tf.engine().startScope();
      
      logger.info('Tensor cleanup completed');
    } catch (error) {
      logger.error('Error during tensor cleanup:', error);
    }
  }

  async loadExistingModels() {
    try {
      // Try to load price model
      if (fs.existsSync(path.join(this.modelPath, 'priceModel.json'))) {
        const loaded = await this.loadModel('price');
        if (loaded) {
          logger.info('Loaded existing price model');
        } else {
          logger.info('Failed to load price model, will initialize new one');
        }
      }
      
      // Try to load image model
      if (fs.existsSync(path.join(this.modelPath, 'imageModel.json'))) {
        const loaded = await this.loadModel('image');
        if (loaded) {
          logger.info('Loaded existing image model');
        } else {
          logger.info('Failed to load image model, will initialize new one');
        }
      }
    } catch (error) {
      logger.error('Error loading existing models:', error);
    }
  }

  // Price Prediction Model
  async initializePriceModel(inputShape) {
    try {
      this.priceModel = tf.sequential();
      
      // Input layer with feature masking
      this.priceModel.add(tf.layers.dense({
        units: 32,
        inputShape: [inputShape], // Will be dynamically set based on available features
        activation: 'relu',
        kernelInitializer: 'glorotNormal',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
      }));
      
      this.priceModel.add(tf.layers.batchNormalization({
        epsilon: 1e-5,
        momentum: 0.99
      }));
      
      this.priceModel.add(tf.layers.dropout({ rate: 0.2 }));
      
      // Hidden layer with feature attention
      this.priceModel.add(tf.layers.dense({
        units: 16,
        activation: 'relu',
        kernelInitializer: 'glorotNormal',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
      }));
      
      this.priceModel.add(tf.layers.batchNormalization({
        epsilon: 1e-5,
        momentum: 0.99
      }));
      
      this.priceModel.add(tf.layers.dropout({ rate: 0.2 }));
      
      // Output layer with strong regularization
      this.priceModel.add(tf.layers.dense({
        units: 1,
        activation: 'linear',
        kernelInitializer: 'glorotNormal',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
      }));
      
      // Create optimizer with tiny learning rate and gradient clipping
      const optimizer = tf.train.adam(0.001);
      optimizer.clipNorm = 1.0;
      
      this.priceModel.compile({
        optimizer: optimizer,
        loss: 'meanSquaredError',
        metrics: ['mse', 'mae']
      });
      
      // Add validation split and early stopping
      this.trainOpts = {
        epochs: 20,
        batchSize: 8,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}/${this.trainOpts.epochs}`);
            console.log(`Loss: ${logs.loss.toFixed(4)}, Val Loss: ${logs.val_loss.toFixed(4)}`);
            
            if (isNaN(logs.loss) || isNaN(logs.val_loss)) {
              console.log('NaN loss detected, stopping training');
              this.priceModel.stopTraining = true;
            }
          }
        }
      };

      // Update model status with feature tracking
      this.modelStatus.priceModel = { 
        initialized: true, 
        lastTrained: new Date(),
        version: this.incrementVersion(this.modelStatus.priceModel.version),
        featureConfig: {
          basicFeatures: 7, // height, width, weight, category, condition, age, rarity
          colorFeatures: 0, // Will be set during training
          imageFeatures: 0,  // Will be set during training
          hasColors: false,
          hasImages: false
        }
      };

      logger.info(`Price prediction model initialized successfully with input shape [${inputShape}]`);
      return true;
    } catch (error) {
      logger.error('Price model initialization error:', error);
      throw error;
    }
  }

  // Image Classification Model
  async initializeImageModel() {
    try {
      // Create a CNN model for image feature extraction
      this.imageModel = tf.sequential();
      
      // First convolutional block
      this.imageModel.add(tf.layers.conv2d({
        inputShape: [224, 224, 3],
        filters: 32,
        kernelSize: 3,
        activation: 'relu',
        padding: 'same'
      }));
      this.imageModel.add(tf.layers.batchNormalization());
      this.imageModel.add(tf.layers.maxPooling2d({ poolSize: 2 }));
      this.imageModel.add(tf.layers.dropout({ rate: 0.25 }));
      
      // Second convolutional block
      this.imageModel.add(tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu',
        padding: 'same'
      }));
      this.imageModel.add(tf.layers.batchNormalization());
      this.imageModel.add(tf.layers.maxPooling2d({ poolSize: 2 }));
      this.imageModel.add(tf.layers.dropout({ rate: 0.25 }));
      
      // Third convolutional block
      this.imageModel.add(tf.layers.conv2d({
        kernelSize: 3,
        filters: 64,
        activation: 'relu'
      }));
      this.imageModel.add(tf.layers.maxPooling2d({ poolSize: 2 }));
      
      // Flatten and dense layers
      this.imageModel.add(tf.layers.flatten());
      this.imageModel.add(tf.layers.dense({ units: 64, activation: 'relu' }));
      this.imageModel.add(tf.layers.dropout({ rate: 0.5 }));
      this.imageModel.add(tf.layers.dense({ units: 10, activation: 'softmax' })); // 10 categories

      this.imageModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // Update model status
      this.modelStatus.imageModel = { initialized: true, lastTrained: new Date() };

      logger.info('Image classification model initialized successfully');
      return true;
    } catch (error) {
      logger.error('Image model initialization error:', error);
      throw error;
    }
  }

  // Data preprocessing utilities
  preprocessPriceData(data) {
    const features = [];
    const targets = [];
    
    // Calculate statistics for normalization
    const stats = {
      height: { min: Infinity, max: -Infinity },
      width: { min: Infinity, max: -Infinity },
      weight: { min: Infinity, max: -Infinity },
      age: { min: Infinity, max: -Infinity },
      price: { min: Infinity, max: -Infinity, mean: 0, std: 0 },
      // Add color statistics if available
      colors: new Set()
    };

    // First pass: calculate statistics
    let priceSum = 0;
    let priceCount = 0;

    for (const item of data) {
      if (item.height) {
        stats.height.min = Math.min(stats.height.min, item.height);
        stats.height.max = Math.max(stats.height.max, item.height);
      }
      if (item.width) {
        stats.width.min = Math.min(stats.width.min, item.width);
        stats.width.max = Math.max(stats.width.max, item.width);
      }
      if (item.weight) {
        stats.weight.min = Math.min(stats.weight.min, item.weight);
        stats.weight.max = Math.max(stats.weight.max, item.weight);
      }
      if (item.age) {
        stats.age.min = Math.min(stats.age.min, item.age);
        stats.age.max = Math.max(stats.age.max, item.age);
      }
      if (item.estimatedValue) {
        stats.price.min = Math.min(stats.price.min, item.estimatedValue);
        stats.price.max = Math.max(stats.price.max, item.estimatedValue);
        priceSum += item.estimatedValue;
        priceCount++;
      }
      // Collect unique colors if available
      if (item.colors && Array.isArray(item.colors)) {
        item.colors.forEach(color => stats.colors.add(color));
      }
    }

    // Convert colors set to array for consistent indexing
    stats.colors = Array.from(stats.colors);

    // Calculate price mean
    stats.price.mean = priceSum / priceCount;

    // Calculate price standard deviation
    let sumSquaredDiff = 0;
    for (const item of data) {
      if (item.estimatedValue) {
        sumSquaredDiff += Math.pow(item.estimatedValue - stats.price.mean, 2);
      }
    }
    stats.price.std = Math.sqrt(sumSquaredDiff / priceCount);

    // Second pass: normalize and create feature vectors
    for (const item of data) {
      // Start with basic features
      const featureVector = [
        this.normalizeValue(item.height || 0, stats.height.min, stats.height.max),
        this.normalizeValue(item.width || 0, stats.width.min, stats.width.max),
        this.normalizeValue(item.weight || 0, stats.weight.min, stats.weight.max),
        this.encodeCategory(item.category),
        this.encodeCondition(item.condition),
        this.normalizeValue(item.age || 0, stats.age.min, stats.age.max),
        this.encodeRarity(item.rarity)
      ];

      // Add color features (always include, even if empty)
      const colorEncoding = new Array(stats.colors.length).fill(0);
      if (item.colors && Array.isArray(item.colors)) {
        item.colors.forEach(color => {
          const colorIndex = stats.colors.indexOf(color);
          if (colorIndex !== -1) {
            colorEncoding[colorIndex] = 1;
          }
        });
      }
      featureVector.push(...colorEncoding);

      // Add image features (always include, even if empty)
      const imageFeatures = new Array(10).fill(0);
      featureVector.push(...imageFeatures);

      features.push(featureVector);

      // Use min-max normalization instead of z-score for more stability
      const normalizedPrice = this.normalizeValue(item.estimatedValue, stats.price.min, stats.price.max);
      targets.push(normalizedPrice);
    }
    
    return { 
      features, 
      targets,
      stats // Return stats for denormalization during prediction
    };
  }

  async preprocessImageData(imageData) {
    try {
      // Use the new image preprocessing service
      const preprocessedTensor = await this.imagePreprocessing.preprocessImage(imageData);
      
      // Extract color features
      const colorFeatures = await this.imagePreprocessing.extractColorFeatures(preprocessedTensor);
      
      // Return both the preprocessed tensor and color features
      return {
        tensor: preprocessedTensor,
        colorFeatures
      };
    } catch (error) {
      logger.error('Error in image preprocessing:', error);
      throw error;
    }
  }

  // Encoding utilities
  encodeCategory(category) {
    const categories = [
      'Electronics',
      'Clothing',
      'Books',
      'Home & Garden',
      'Sports & Outdoors',
      'Toys & Games',
      'Jewelry',
      'Art',
      'Collectibles',
      'Vehicles',
      'Other'
    ];
    const index = categories.indexOf(category);
    return index >= 0 ? index / (categories.length - 1) : 0.5; // Default to middle value for unknown categories
  }

  encodeCondition(condition) {
    const conditions = [
      'New',
      'Like New',
      'Very Good',
      'Good',
      'Fair',
      'Poor'
    ];
    const index = conditions.indexOf(condition);
    return index >= 0 ? index / (conditions.length - 1) : 0.5; // Default to middle value for unknown conditions
  }

  encodeRarity(rarity) {
    const rarities = [
      'Common',
      'Uncommon',
      'Rare',
      'Very Rare',
      'Extremely Rare'
    ];
    const index = rarities.indexOf(rarity);
    return index >= 0 ? index / (rarities.length - 1) : 0.5; // Default to middle value for unknown rarities
  }

  // Helper function to normalize values to [0,1] range
  normalizeValue(value, min, max) {
    if (max === min) return 0.5; // Avoid division by zero
    return (value - min) / (max - min);
  }

  // Helper method to calculate feature importance
  async calculateFeatureImportance(model, features, targets) {
    try {
      const basePrediction = await model.predict(tf.tensor2d(features)).data();
      const importance = [];
      
      // Calculate importance for each feature using multiple methods
      for (let i = 0; i < features[0].length; i++) {
        // Method 1: Feature perturbation
        const perturbedFeatures = features.map(f => [...f]);
        for (let j = 0; j < perturbedFeatures.length; j++) {
          perturbedFeatures[j][i] = 1 - perturbedFeatures[j][i];
        }
        const perturbedPrediction = await model.predict(tf.tensor2d(perturbedFeatures)).data();
        const perturbationDiff = Math.abs(perturbedPrediction[0] - basePrediction[0]);

        // Method 2: Feature masking
        const maskedFeatures = features.map(f => {
          const masked = [...f];
          masked[i] = 0;
          return masked;
        });
        const maskedPrediction = await model.predict(tf.tensor2d(maskedFeatures)).data();
        const maskingDiff = Math.abs(maskedPrediction[0] - basePrediction[0]);

        // Method 3: Feature correlation with target
        const featureValues = features.map(f => f[i]);
        const correlation = this.calculateCorrelation(featureValues, targets);

        // Combine methods for robust importance score
        const importanceScore = (
          perturbationDiff * 0.4 +
          maskingDiff * 0.4 +
          Math.abs(correlation) * 0.2
        );

        importance.push(importanceScore);
      }
      
      // Normalize importance scores
      const maxImportance = Math.max(...importance);
      return importance.map(imp => imp / maxImportance);
    } catch (error) {
      logger.error('Error calculating feature importance:', error);
      return null;
    }
  }

  calculateCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Training methods
  async trainPriceModel(data, epochs = 20) {
    try {
      console.log('Starting price model training with cross-validation...');
      
      // Validate input data
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid training data format. Expected non-empty array.');
      }

      if (data.length === 0) {
        throw new Error('Training data array is empty.');
      }

      // Validate required fields
      data.forEach((item, index) => {
        if (!item.height || !item.width || !item.weight || !item.category || 
            !item.condition || !item.age || !item.rarity || !item.estimatedValue) {
          throw new Error(`Missing required fields in training data at index ${index}`);
        }
      });

      // Calculate total input shape based on available features
      const hasColors = data.some(item => item.colors && Array.isArray(item.colors));
      const hasImages = data.some(item => item.imageUrl);
      
      // Count unique colors if available
      const uniqueColors = new Set();
      if (hasColors) {
        data.forEach(item => {
          if (item.colors && Array.isArray(item.colors)) {
            item.colors.forEach(color => uniqueColors.add(color));
          }
        });
      }
      
      // Calculate total input shape
      const basicFeatures = 7; // height, width, weight, category, condition, age, rarity
      const colorFeatures = hasColors ? uniqueColors.size : 0;
      const imageFeatures = hasImages ? 10 : 0; // Assuming 10 features from image model
      const totalInputShape = basicFeatures + colorFeatures + imageFeatures;

      // Always reinitialize the model with the correct input shape
      this.priceModel = null; // Clear existing model
      await this.initializePriceModel(totalInputShape);
      
      // Update feature configuration
      this.modelStatus.priceModel.featureConfig = {
        basicFeatures,
        colorFeatures,
        imageFeatures,
        hasColors,
        hasImages
      };

      // Perform cross-validation with error handling
      let cvResults;
      try {
        cvResults = await this.performCrossValidation(data);
      } catch (error) {
        logger.error('Cross-validation error:', error);
        throw new Error('Cross-validation failed: ' + error.message);
      }

      // Train final model on all data with error handling
      let features, targets, stats;
      try {
        ({ features, targets, stats } = this.preprocessPriceData(data));
      } catch (error) {
        logger.error('Data preprocessing error:', error);
        throw new Error('Failed to preprocess training data: ' + error.message);
      }

      try {
        await this.saveModelStats(stats);
      } catch (error) {
        logger.error('Error saving model stats:', error);
        // Continue despite stats saving error
      }

      let trainFeatures, trainLabels;
      try {
        trainFeatures = tf.tensor2d(features);
        trainLabels = tf.tensor2d(targets, [targets.length, 1]);
      } catch (error) {
        logger.error('Error creating tensors:', error);
        throw new Error('Failed to create tensors from training data: ' + error.message);
      }

      let history;
      try {
        history = await this.priceModel.fit(trainFeatures, trainLabels, {
          epochs: epochs || 20,
          batchSize: 32,
          validationSplit: 0.2,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              if (!logs || typeof logs.loss === 'undefined' || typeof logs.val_loss === 'undefined') {
                logger.warn('Invalid training logs received');
                return;
              }
              console.log(`Epoch ${epoch + 1}/${epochs}`);
              console.log(`Training loss: ${logs.loss.toFixed(4)}, Validation loss: ${logs.val_loss.toFixed(4)}`);
            },
            onBatchEnd: () => {
              // Force garbage collection to prevent memory leaks
              if (global.gc) {
                global.gc();
              }
            }
          }
        });
      } catch (error) {
        logger.error('Model training error:', error);
        throw new Error('Failed to train model: ' + error.message);
      }

      // Update model status with cross-validation results
      try {
        this.modelStatus.priceModel = {
          ...this.modelStatus.priceModel,
          lastTrained: new Date().toISOString(),
          version: this.incrementVersion(this.modelStatus.priceModel.version),
          performance: {
            ...this.modelStatus.priceModel.performance,
            lastValidationLoss: history.history.val_loss[history.history.val_loss.length - 1],
            crossValidation: cvResults.averageMetrics,
            featureImportance: cvResults.featureImportance,
            featureUsage: {
              basic: true,
              colors: this.modelStatus.priceModel.featureConfig.colorFeatures > 0,
              image: this.modelStatus.priceModel.featureConfig.imageFeatures > 0
            }
          }
        };
      } catch (error) {
        logger.error('Error updating model status:', error);
        // Continue despite status update error
      }

      // Save model and updated status
      try {
        await this.saveModel('price');
        await this.saveModelStatus();
      } catch (error) {
        logger.error('Error saving model:', error);
        throw new Error('Failed to save model: ' + error.message);
      }

      // Clean up tensors
      try {
        if (trainFeatures) trainFeatures.dispose();
        if (trainLabels) trainLabels.dispose();
      } catch (error) {
        logger.error('Error disposing tensors:', error);
        // Continue despite tensor cleanup error
      }

      console.log('Price model training completed successfully');
      console.log('Cross-validation metrics:', cvResults.averageMetrics);
      console.log('Feature importance:', cvResults.featureImportance);
      console.log('Feature usage:', this.modelStatus.priceModel.performance.featureUsage);

      return {
        success: true,
        message: 'Model trained successfully',
        metrics: this.modelStatus.priceModel.performance,
        crossValidation: cvResults
      };
    } catch (error) {
      logger.error('Fatal error in trainPriceModel:', error);
      // Clean up any remaining tensors
      try {
        tf.disposeVariables();
      } catch (cleanupError) {
        logger.error('Error during tensor cleanup:', cleanupError);
      }
      throw error;
    }
  }

  async trainImageModel(data, epochs = 50) {
    try {
      // Initialize model if not already done
      if (!this.imageModel) {
        await this.initializeImageModel();
      }

      // Process images and labels
      const images = [];
      const labels = [];
      const colorFeatures = [];
      
      for (const item of data) {
        if (item.imageUrl) {
          const { tensor, colorFeatures: features } = await this.preprocessImageData(item.imageUrl);
          images.push(tensor);
          labels.push(this.encodeCategory(item.category));
          colorFeatures.push(features);
        }
      }

      // Stack tensors
      const xs = tf.concat(images, 0);
      const ys = tf.oneHot(labels, 10);

      // Train model
      const history = await this.imageModel.fit(xs, ys, {
        epochs,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            logger.info(`Image model - Epoch ${epoch + 1} of ${epochs}`);
            logger.info(`Accuracy: ${logs.acc}, Validation Accuracy: ${logs.val_acc}`);
          }
        }
      });

      // Save model
      await this.saveModel('image');

      // Update model status
      this.modelStatus.imageModel = { initialized: true, lastTrained: new Date() };

      // Clean up tensors
      xs.dispose();
      ys.dispose();
      images.forEach(tensor => tensor.dispose());

      return {
        history: history.history,
        trainingSamples: data.length,
        colorFeatures
      };
    } catch (error) {
      logger.error('Image model training error:', error);
      throw error;
    }
  }

  // Prediction methods
  async predictPrice(data) {
    try {
      if (!this.priceModel) {
        throw new Error('Price prediction model not initialized');
      }

      // Load model statistics from file
      const statsPath = path.join(this.modelPath, 'priceModelStats.json');
      if (!fs.existsSync(statsPath)) {
        throw new Error('Model statistics not found. Please retrain the model.');
      }
      const stats = JSON.parse(await fsPromises.readFile(statsPath, 'utf8'));

      // Convert input to array if single item
      const items = Array.isArray(data) ? data : [data];
      const predictions = [];

      for (const item of items) {
        // Validate required fields
        if (!item.height || !item.width || !item.weight || !item.category || 
            !item.condition || !item.age || !item.rarity) {
          throw new Error('Missing required fields in input data');
        }

        // Start with basic features
        const features = [
          this.normalizeValue(item.height || 0, stats.height.min, stats.height.max),
          this.normalizeValue(item.width || 0, stats.width.min, stats.width.max),
          this.normalizeValue(item.weight || 0, stats.weight.min, stats.weight.max),
          this.encodeCategory(item.category),
          this.encodeCondition(item.condition),
          this.normalizeValue(item.age || 0, stats.age.min, stats.age.max),
          this.encodeRarity(item.rarity)
        ];

        // Add color features (always include, even if empty)
        const colorEncoding = new Array(stats.colors.length).fill(0);
        if (item.colors && Array.isArray(item.colors)) {
          item.colors.forEach(color => {
            const colorIndex = stats.colors.indexOf(color);
            if (colorIndex !== -1) {
              colorEncoding[colorIndex] = 1;
            }
          });
        }
        features.push(...colorEncoding);

        // Add image features (always include, even if empty)
        const imageFeatures = new Array(10).fill(0);
        features.push(...imageFeatures);

        // Make multiple predictions with dropout enabled for uncertainty estimation
        const numSamples = 10;
        const samples = [];
        for (let i = 0; i < numSamples; i++) {
          const xs = tf.tensor2d([features]);
          const prediction = this.priceModel.predict(xs, { training: true }); // Enable dropout
          const value = await prediction.data();
          samples.push(Math.max(0, value[0])); // Ensure non-negative predictions
          xs.dispose();
          prediction.dispose();
        }

        // Calculate mean and standard deviation
        const mean = samples.reduce((a, b) => a + b, 0) / numSamples;
        const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numSamples;
        const std = Math.sqrt(variance);

        // Denormalize prediction and ensure non-negative values
        const denormalizedValue = Math.max(0, mean * (stats.price.max - stats.price.min) + stats.price.min);

        // Calculate confidence based on prediction variance and model's validation loss
        const lastValLoss = this.trainOpts.lastValLoss || 0.1;
        const normalizedStd = std / mean; // Coefficient of variation
        const confidence = Math.max(0, Math.min(1, 1 - (normalizedStd + lastValLoss) / 2));

        // Calculate prediction range with non-negative bounds
        const range = {
          low: Math.max(0, denormalizedValue - 2 * std * (stats.price.max - stats.price.min)),
          high: Math.max(denormalizedValue, denormalizedValue + 2 * std * (stats.price.max - stats.price.min))
        };

        predictions.push({
          predicted_value: denormalizedValue,
          confidence: confidence,
          range: range,
          features_used: {
            basic: true,
            colors: Boolean(item.colors && this.modelStatus.priceModel.featureConfig.hasColors),
            image: Boolean(item.imageUrl && this.modelStatus.priceModel.featureConfig.hasImages)
          }
        });
      }

      return predictions;
    } catch (error) {
      logger.error('Price prediction error:', error);
      throw error;
    }
  }

  async classifyImage(imageData) {
    try {
      if (!this.imageModel) {
        throw new Error('Image classification model not initialized');
      }

      const { tensor: processedImage, colorFeatures } = await this.preprocessImageData(imageData);
      const predictions = this.imageModel.predict(processedImage);
      const results = await predictions.array();

      processedImage.dispose();
      predictions.dispose();

      return {
        category: this.decodeCategory(results[0].indexOf(Math.max(...results[0]))),
        confidence: Math.max(...results[0]),
        colorFeatures
      };
    } catch (error) {
      logger.error('Image classification error:', error);
      throw error;
    }
  }

  // Similar item recommendations
  async findSimilarItems(itemId, count = 5) {
    try {
      const itemEmbedding = this.embeddings.get(itemId);
      if (!itemEmbedding) {
        throw new Error('Item not found in embeddings');
      }

      const similarities = [];
      for (const [id, embedding] of this.embeddings.entries()) {
        if (id !== itemId) {
          const similarity = tf.tidy(() => {
            return tf.losses.cosineProximity(itemEmbedding, embedding);
          });
          similarities.push({ id, similarity: await similarity.data() });
        }
      }

      // Sort by similarity and get top N
      similarities.sort((a, b) => b.similarity - a.similarity);
      return similarities.slice(0, count);
    } catch (error) {
      logger.error('Similar items search error:', error);
      throw error;
    }
  }

  // Utility methods
  calculateConfidence(predicted, actual) {
    const error = Math.abs(predicted - actual);
    const maxError = Math.max(predicted, actual);
    return Math.max(0, 1 - (error / maxError));
  }

  decodeCategory(index) {
    const categories = ['furniture', 'art', 'jewelry', 'antiques', 'collectibles', 'other'];
    return categories[index] || 'other';
  }

  // Model saving and loading
  async saveModel(type) {
    try {
      const modelPath = path.join(this.modelPath, `${type}Model.json`);
      const weightsPath = path.join(this.modelPath, `${type}Model.weights.bin`);
      
      // Save model architecture
      const modelJson = this.priceModel.toJSON();
      await fsPromises.writeFile(modelPath, JSON.stringify(modelJson));
      
      // Save weights using browser-compatible method
      const weights = this.priceModel.getWeights();
      const weightData = new Float32Array(weights.reduce((acc, w) => acc + w.size, 0));
      let offset = 0;
      weights.forEach(w => {
        const data = w.dataSync();
        weightData.set(data, offset);
        offset += w.size;
      });
      await fsPromises.writeFile(weightsPath, Buffer.from(weightData.buffer));
      
      logger.info(`${type} model saved successfully to ${modelPath}`);
      return modelPath;
    } catch (error) {
      logger.error(`Error saving ${type} model:`, error);
      throw error;
    }
  }

  async loadModel(type) {
    try {
      const modelPath = path.join(this.modelPath, `${type}Model.json`);
      const weightsPath = path.join(this.modelPath, `${type}Model.weights.bin`);
      
      if (!fs.existsSync(modelPath) || !fs.existsSync(weightsPath)) {
        logger.info('No existing model found, will initialize new model');
        return false;
      }
      
      // Load model architecture first
      const modelJson = JSON.parse(await fsPromises.readFile(modelPath, 'utf8'));
      
      // Initialize model with the same architecture as saved model
      if (type === 'price') {
        // Calculate input shape from saved model
        const inputShape = modelJson.layers[0].config.inputShape[1];
        await this.initializePriceModel(inputShape);
        
        // Load weights
        const weights = await fsPromises.readFile(weightsPath);
        const weightData = new Float32Array(weights.buffer);
        
        // Verify weight count matches model architecture
        const expectedWeightCount = this.priceModel.countParams();
        if (weightData.length !== expectedWeightCount) {
          logger.warn(`Weight count mismatch. Expected ${expectedWeightCount}, got ${weightData.length}`);
          return false;
        }
        
        // Set weights
        this.priceModel.setWeights(weightData);
      } else if (type === 'image') {
        await this.initializeImageModel();
        
        // Load weights
        const weights = await fsPromises.readFile(weightsPath);
        const weightData = new Float32Array(weights.buffer);
        
        // Verify weight count matches model architecture
        const expectedWeightCount = this.imageModel.countParams();
        if (weightData.length !== expectedWeightCount) {
          logger.warn(`Weight count mismatch. Expected ${expectedWeightCount}, got ${weightData.length}`);
          return false;
        }
        
        // Set weights
        this.imageModel.setWeights(weightData);
      }
      
      logger.info(`${type} model loaded successfully from ${modelPath}`);
      return true;
    } catch (error) {
      logger.error(`Error loading ${type} model:`, error);
      return false;
    }
  }

  // Helper method to increment version number
  incrementVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  // Get model info with performance metrics
  async getModelInfo() {
    return {
      priceModel: {
        initialized: this.modelStatus.priceModel.initialized,
        lastTrained: this.modelStatus.priceModel.lastTrained,
        version: this.modelStatus.priceModel.version,
        performance: this.modelStatus.priceModel.performance
      },
      imageModel: {
        initialized: this.modelStatus.imageModel.initialized,
        lastTrained: this.modelStatus.imageModel.lastTrained,
        version: this.modelStatus.imageModel.version,
        performance: this.modelStatus.imageModel.performance
      }
    };
  }

  // Save model statistics during training
  async saveModelStats(stats) {
    try {
      const statsPath = path.join(this.modelPath, 'priceModelStats.json');
      await fsPromises.writeFile(statsPath, JSON.stringify(stats));
      logger.info('Model statistics saved successfully');
    } catch (error) {
      logger.error('Error saving model statistics:', error);
      throw error;
    }
  }

  // Helper method to calculate R² score
  calculateR2Score(yTrue, yPred) {
    const yMean = tf.mean(yTrue);
    const ssTot = tf.sum(tf.square(tf.sub(yTrue, yMean)));
    const ssRes = tf.sum(tf.square(tf.sub(yTrue, yPred)));
    return 1 - ssRes.div(ssTot).dataSync()[0];
  }

  // Data preparation wrapper
  preparePriceData(data) {
    return this.preprocessPriceData(data);
  }

  // New method to process image features
  async processImageFeatures(imageUrl) {
    try {
      if (!this.imageModel) {
        throw new Error('Image model not initialized');
      }

      const processedImage = await this.preprocessImageData(imageUrl);
      const imageFeatures = this.imageModel.predict(processedImage, { training: false });
      const features = await imageFeatures.data();

      processedImage.dispose();
      imageFeatures.dispose();

      return Array.from(features);
    } catch (error) {
      logger.error('Error processing image features:', error);
      throw error;
    }
  }

  // Add new methods for cross-validation and feature importance
  async performCrossValidation(data, k = 5) {
    try {
      // Validate input data
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid or empty training data for cross-validation');
      }

      // Ensure k is not larger than the data size
      k = Math.min(k, data.length);
      if (k < 2) {
        throw new Error('Not enough data for cross-validation. Need at least 2 samples.');
      }

      // Preprocess all data first to ensure consistent feature dimensions
      const allData = this.preprocessPriceData(data);
      const allFeatures = allData.features;
      const allTargets = allData.targets;

      // Validate feature dimensions
      if (!allFeatures || !allFeatures.length || !allFeatures[0] || !allFeatures[0].length) {
        throw new Error('Invalid feature arrays after preprocessing');
      }

      const foldSize = Math.floor(allFeatures.length / k);
      const folds = [];
      const results = [];

      // Create k folds
      for (let i = 0; i < k; i++) {
        const start = i * foldSize;
        const end = i === k - 1 ? allFeatures.length : (i + 1) * foldSize;
        folds.push({
          features: allFeatures.slice(start, end),
          targets: allTargets.slice(start, end)
        });
      }

      // Perform k-fold cross-validation
      for (let i = 0; i < k; i++) {
        // Create training and validation sets
        const validationSet = folds[i];
        const trainingSet = folds.filter((_, index) => index !== i).reduce((acc, fold) => ({
          features: acc.features.concat(fold.features),
          targets: acc.targets.concat(fold.targets)
        }), { features: [], targets: [] });

        // Validate sets
        if (validationSet.features.length === 0 || trainingSet.features.length === 0) {
          throw new Error(`Empty validation or training set in fold ${i + 1}`);
        }

        // Convert to tensors with explicit shapes
        const trainXs = tf.tensor2d(trainingSet.features, [trainingSet.features.length, trainingSet.features[0].length]);
        const trainYs = tf.tensor2d(trainingSet.targets, [trainingSet.targets.length, 1]);
        const valXs = tf.tensor2d(validationSet.features, [validationSet.features.length, validationSet.features[0].length]);
        const valYs = tf.tensor2d(validationSet.targets, [validationSet.targets.length, 1]);

        // Train model
        const history = await this.priceModel.fit(trainXs, trainYs, {
          epochs: 20,
          batchSize: 32,
          validationData: [valXs, valYs],
          verbose: 0
        });

        // Calculate metrics
        const predictions = await this.priceModel.predict(valXs);
        const mse = tf.metrics.meanSquaredError(valYs, predictions).dataSync()[0];
        const mae = tf.metrics.meanAbsoluteError(valYs, predictions).dataSync()[0];
        const r2 = this.calculateR2Score(valYs, predictions);

        // Calculate feature importance for this fold
        const featureImportance = await this.calculateFeatureImportance(this.priceModel, validationSet.features, validationSet.targets);

        results.push({
          fold: i + 1,
          metrics: { mse, mae, r2 },
          featureImportance,
          validationLoss: history.history.val_loss[history.history.val_loss.length - 1]
        });

        // Clean up tensors
        trainXs.dispose();
        trainYs.dispose();
        valXs.dispose();
        valYs.dispose();
        predictions.dispose();
      }

      // Calculate average metrics and feature importance
      const avgMetrics = {
        mse: results.reduce((acc, r) => acc + r.metrics.mse, 0) / k,
        mae: results.reduce((acc, r) => acc + r.metrics.mae, 0) / k,
        r2: results.reduce((acc, r) => acc + r.metrics.r2, 0) / k,
        validationLoss: results.reduce((acc, r) => acc + r.validationLoss, 0) / k
      };

      // Calculate average feature importance with standard deviation
      const numFeatures = results[0].featureImportance.length;
      const avgFeatureImportance = new Array(numFeatures).fill(0);
      const stdFeatureImportance = new Array(numFeatures).fill(0);

      for (let i = 0; i < numFeatures; i++) {
        const values = results.map(r => r.featureImportance[i]);
        const mean = values.reduce((a, b) => a + b, 0) / k;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / k;
        avgFeatureImportance[i] = mean;
        stdFeatureImportance[i] = Math.sqrt(variance);
      }

      return {
        averageMetrics: avgMetrics,
        featureImportance: {
          mean: avgFeatureImportance,
          std: stdFeatureImportance
        },
        foldResults: results
      };
    } catch (error) {
      logger.error('Cross-validation error:', error);
      throw error;
    }
  }

  // Helper method to safely dispose tensors
  disposeTensors(...tensors) {
    tensors.forEach(tensor => {
      if (tensor && typeof tensor.dispose === 'function') {
        try {
          tensor.dispose();
        } catch (error) {
          logger.error('Error disposing tensor:', error);
        }
      }
    });
  }

  async saveModelStatus() {
    try {
      const statusPath = path.join(this.modelPath, 'modelStatus.json');
      await fsPromises.writeFile(statusPath, JSON.stringify(this.modelStatus, null, 2));
      logger.info('Model status saved successfully');
    } catch (error) {
      logger.error('Error saving model status:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new MLService(); 