const express = require('express');
const router = express.Router();
const mlService = require('../services/mlService');
const tf = require('@tensorflow/tfjs');

// Test TensorFlow.js functionality
router.get('/test', async (req, res) => {
  try {
    // Create a simple tensor
    const tensor = tf.tensor2d([[1, 2], [3, 4]]);
    
    // Perform a simple operation
    const result = tensor.add(tensor);
    
    // Get the values as an array
    const values = await result.array();
    
    // Clean up tensors
    tensor.dispose();
    result.dispose();
    
    res.json({
      success: true,
      message: 'TensorFlow.js is working correctly',
      test: {
        original: [[1, 2], [3, 4]],
        result: values
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Get model status
router.get('/status', async (req, res) => {
  try {
    const modelInfo = await mlService.getModelInfo();
    res.json(modelInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Train price prediction model
router.post('/train/price', async (req, res) => {
  try {
    const { data, epochs } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Training data is required' });
    }
    const result = await mlService.trainPriceModel(data, epochs);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Train image classification model
router.post('/train/image', async (req, res) => {
  try {
    const { data, epochs } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Training data is required' });
    }
    const result = await mlService.trainImageModel(data, epochs);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Predict price
router.post('/predict/price', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Input data is required' });
    }
    
    // Convert single item to array if needed
    const dataArray = Array.isArray(data) ? data : [data];
    
    const predictions = await mlService.predictPrice(dataArray);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Classify image
router.post('/classify/image', async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }
    const classification = await mlService.classifyImage(imageData);
    res.json(classification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find similar items
router.get('/similar/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { count } = req.query;
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    const similarItems = await mlService.findSimilarItems(itemId, parseInt(count) || 5);
    res.json(similarItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load model
router.post('/load/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { modelPath } = req.body;
    if (!type || !modelPath) {
      return res.status(400).json({ error: 'Model type and path are required' });
    }
    await mlService.loadModel(type, modelPath);
    res.json({ message: 'Model loaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 