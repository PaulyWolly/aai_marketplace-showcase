const tf = require('@tensorflow/tfjs');
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

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

class MLService {
  constructor() {
    // Set up model paths
    this.modelPath = path.join(process.cwd(), 'models');
    
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
  }

  async loadExistingModels() {
    try {
      // Try to load price model
      if (fs.existsSync(path.join(this.modelPath, 'priceModel.json'))) {
        await this.loadModel('price');
        logger.info('Loaded existing price model');
      }
      
      // Try to load image model
      if (fs.existsSync(path.join(this.modelPath, 'imageModel.json'))) {
        await this.loadModel('image');
        logger.info('Loaded existing image model');
      }
    } catch (error) {
      logger.error('Error loading existing models:', error);
    }
  }

  // Price Prediction Model
  async initializePriceModel(inputShape) {
    try {
      this.priceModel = tf.sequential();
      
      // First layer with strong regularization
      this.priceModel.add(tf.layers.dense({
        units: 16,
        inputShape: [7],
        activation: 'relu',
        kernelInitializer: 'glorotNormal',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
      }));
      
      this.priceModel.add(tf.layers.batchNormalization({
        epsilon: 1e-5,
        momentum: 0.99
      }));
      
      this.priceModel.add(tf.layers.dropout({ rate: 0.2 }));
      
      // Hidden layer
      this.priceModel.add(tf.layers.dense({
        units: 8,
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

      // Update model status
      this.modelStatus.priceModel = { initialized: true, lastTrained: new Date() };

      logger.info('Price prediction model initialized successfully');
      return true;
    } catch (error) {
      logger.error('Price model initialization error:', error);
      throw error;
    }
  }

  // Image Classification Model
  async initializeImageModel() {
    try {
      this.imageModel = tf.sequential();
      
      // Convolutional layers
      this.imageModel.add(tf.layers.conv2d({
        inputShape: [224, 224, 3],
        kernelSize: 3,
        filters: 32,
        activation: 'relu'
      }));
      this.imageModel.add(tf.layers.maxPooling2d({ poolSize: 2 }));
      
      this.imageModel.add(tf.layers.conv2d({
        kernelSize: 3,
        filters: 64,
        activation: 'relu'
      }));
      this.imageModel.add(tf.layers.maxPooling2d({ poolSize: 2 }));
      
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
      price: { min: Infinity, max: -Infinity, mean: 0, std: 0 }
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
    }

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
      const featureVector = [
        this.normalizeValue(item.height || 0, stats.height.min, stats.height.max),
        this.normalizeValue(item.width || 0, stats.width.min, stats.width.max),
        this.normalizeValue(item.weight || 0, stats.weight.min, stats.weight.max),
        this.encodeCategory(item.category),
        this.encodeCondition(item.condition),
        this.normalizeValue(item.age || 0, stats.age.min, stats.age.max),
        this.encodeRarity(item.rarity)
      ];
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

  preprocessImageData(imageData) {
    // Resize image to 224x224 and normalize pixel values
    return tf.tidy(() => {
      const tensor = tf.browser.fromPixels(imageData)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255.0)
        .expandDims(0);
      return tensor;
    });
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
      
      // Calculate importance for each feature
      for (let i = 0; i < features[0].length; i++) {
        const perturbedFeatures = features.map(f => [...f]);
        for (let j = 0; j < perturbedFeatures.length; j++) {
          perturbedFeatures[j][i] = 1 - perturbedFeatures[j][i]; // Flip the feature
        }
        const perturbedPrediction = await model.predict(tf.tensor2d(perturbedFeatures)).data();
        const diff = Math.abs(perturbedPrediction[0] - basePrediction[0]);
        importance.push(diff);
      }
      
      // Normalize importance scores
      const maxImportance = Math.max(...importance);
      return importance.map(imp => imp / maxImportance);
    } catch (error) {
      logger.error('Error calculating feature importance:', error);
      return null;
    }
  }

  // Training methods
  async trainPriceModel(data, epochs = 20) {
    try {
      if (data.length < 5) {
        throw new Error('Not enough data points for training. Minimum required: 5');
      }

      // Initialize model if not already done
      if (!this.priceModel) {
        await this.initializePriceModel(7);
      }

      // Preprocess data and get statistics
      const { features, targets, stats } = this.preprocessPriceData(data);
      
      // Save statistics for later use in predictions
      await this.saveModelStats(stats);

      // Convert to tensors
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(targets, [targets.length, 1]);

      // Train model
      const history = await this.priceModel.fit(xs, ys, {
        ...this.trainOpts,
        epochs: epochs || this.trainOpts.epochs
      });

      // Calculate feature importance
      const featureImportance = await this.calculateFeatureImportance(this.priceModel, features, targets);

      // Update model status with performance metrics
      this.modelStatus.priceModel = {
        ...this.modelStatus.priceModel,
        lastTrained: new Date(),
        version: this.incrementVersion(this.modelStatus.priceModel.version),
        performance: {
          lastValidationLoss: history.history.val_loss[history.history.val_loss.length - 1],
          lastTrainingLoss: history.history.loss[history.history.loss.length - 1],
          featureImportance
        }
      };

      // Clean up tensors
      xs.dispose();
      ys.dispose();

      // Save model
      await this.saveModel('price');

      return {
        history: history.history,
        inputFeatures: features[0].length,
        trainingSamples: features.length,
        finalLoss: history.history.loss[history.history.loss.length - 1],
        finalValLoss: history.history.val_loss[history.history.val_loss.length - 1],
        featureImportance,
        modelVersion: this.modelStatus.priceModel.version
      };
    } catch (error) {
      logger.error('Price model training error:', error);
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
      
      for (const item of data) {
        if (item.imageUrl) {
          const imageTensor = await this.preprocessImageData(item.imageUrl);
          images.push(imageTensor);
          labels.push(this.encodeCategory(item.category));
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

      return {
        history: history.history,
        trainingSamples: data.length
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
        // Preprocess input
        const features = [
          this.normalizeValue(item.height || 0, stats.height.min, stats.height.max),
          this.normalizeValue(item.width || 0, stats.width.min, stats.width.max),
          this.normalizeValue(item.weight || 0, stats.weight.min, stats.weight.max),
          this.encodeCategory(item.category),
          this.encodeCondition(item.condition),
          this.normalizeValue(item.age || 0, stats.age.min, stats.age.max),
          this.encodeRarity(item.rarity)
        ];

        // Make multiple predictions with dropout enabled for uncertainty estimation
        const numSamples = 10;
        const samples = [];
        for (let i = 0; i < numSamples; i++) {
          const xs = tf.tensor2d([features]);
          const prediction = this.priceModel.predict(xs, { training: true }); // Enable dropout
          const value = await prediction.data();
          samples.push(value[0]);
          xs.dispose();
          prediction.dispose();
        }

        // Calculate mean and standard deviation
        const mean = samples.reduce((a, b) => a + b, 0) / numSamples;
        const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numSamples;
        const std = Math.sqrt(variance);

        // Denormalize prediction
        const denormalizedValue = mean * (stats.price.max - stats.price.min) + stats.price.min;

        // Calculate confidence based on prediction variance and model's validation loss
        const lastValLoss = this.trainOpts.lastValLoss || 0.1;
        const normalizedStd = std / mean; // Coefficient of variation
        const confidence = Math.max(0, Math.min(1, 1 - (normalizedStd + lastValLoss) / 2));

        predictions.push({
          predicted_value: denormalizedValue,
          confidence: confidence,
          range: {
            low: Math.max(0, denormalizedValue - 2 * std * (stats.price.max - stats.price.min)),
            high: denormalizedValue + 2 * std * (stats.price.max - stats.price.min)
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

      const processedImage = await this.preprocessImageData(imageData);
      const predictions = this.imageModel.predict(processedImage);
      const results = await predictions.array();

      processedImage.dispose();
      predictions.dispose();

      return {
        category: this.decodeCategory(results[0].indexOf(Math.max(...results[0]))),
        confidence: Math.max(...results[0])
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
        throw new Error('Model files not found');
      }
      
      // Initialize model architecture
      if (type === 'price') {
        await this.initializePriceModel(7);
        
        // Load weights using browser-compatible method
        const weights = await fsPromises.readFile(weightsPath);
        const weightData = new Float32Array(weights.buffer);
        
        // Set weights using browser-compatible method
        this.priceModel.setWeights(weightData);
      } else if (type === 'image') {
        await this.initializeImageModel();
        
        // Load weights using browser-compatible method
        const weights = await fsPromises.readFile(weightsPath);
        const weightData = new Float32Array(weights.buffer);
        
        // Set weights using browser-compatible method
        this.imageModel.setWeights(weightData);
      }
      
      logger.info(`${type} model loaded successfully from ${modelPath}`);
      return true;
    } catch (error) {
      logger.error(`Error loading ${type} model:`, error);
      throw error;
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
}

// Export singleton instance
module.exports = new MLService(); 