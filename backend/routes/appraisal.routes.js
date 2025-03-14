const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth, isAdmin } = require('../middleware/auth');
const Appraisal = require('../models/appraisal.model');
const openAIService = require('../services/openai.service');

// Define Appraisal Schema if it doesn't exist
let AppraisalSchema;
try {
  AppraisalSchema = mongoose.model('Appraisal');
} catch (error) {
  AppraisalSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    name: { type: String, required: true },
    category: { type: String, default: 'Uncategorized' },
    condition: { type: String, default: 'Unknown' },
    estimatedValue: { type: String, default: 'Unknown' },
    imageUrl: { type: String, required: true },
    images: { type: [String], default: [] },
    height: { type: String },
    width: { type: String },
    weight: { type: String },
    appraisal: {
      details: { type: String, required: true },
      marketResearch: { type: String, required: true }
    },
    isPublished: { type: Boolean, default: true }
  });
  
  AppraisalSchema = mongoose.model('Appraisal', AppraisalSchema);
}

// Analyze an image
router.post('/analyze', auth, async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ message: 'Image data is required' });
    }
    
    console.log(`Received image data of length: ${imageData.length}`);
    console.log(`Image data starts with: ${imageData.substring(0, 50)}...`);
    
    // Remove the base64 prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    const analysis = await openAIService.analyzeImage(base64Data);
    
    return res.json({
      timestamp: new Date(),
      imageUrl: imageData,
      appraisal: {
        details: analysis.details,
        marketResearch: analysis.marketResearch
      }
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return res.status(500).json({ message: 'Error analyzing image', error: error.message });
  }
});

// Save an appraisal
router.post('/save', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    console.log('Received appraisal data:', JSON.stringify(req.body, null, 2));
    
    // Ensure required fields are present
    const requiredFields = ['name', 'category', 'condition', 'estimatedValue', 'imageUrl', 'appraisal'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields,
        received: Object.keys(req.body)
      });
    }
    
    // Ensure appraisal object has required fields
    if (!req.body.appraisal.details || !req.body.appraisal.marketResearch) {
      console.error('Missing required appraisal fields:', 
        !req.body.appraisal.details ? 'details' : '',
        !req.body.appraisal.marketResearch ? 'marketResearch' : ''
      );
      return res.status(400).json({ 
        message: 'Missing required appraisal fields',
        missingFields: [
          !req.body.appraisal.details ? 'appraisal.details' : null,
          !req.body.appraisal.marketResearch ? 'appraisal.marketResearch' : null
        ].filter(Boolean)
      });
    }
    
    // Create a new appraisal or update an existing one
    const appraisalData = {
      ...req.body,
      timestamp: req.body.timestamp || new Date(),
      isPublished: req.body.isPublished !== undefined ? req.body.isPublished : true
    };
    
    // If not admin, always set userId to current user
    // If admin, preserve the original userId if it exists
    if (!isAdmin || !appraisalData.userId) {
      appraisalData.userId = userId;
    }
    
    let appraisal;
    
    if (req.body._id) {
      // Update existing appraisal
      if (isAdmin) {
        // Admin can update any appraisal
        appraisal = await AppraisalSchema.findOneAndUpdate(
          { _id: req.body._id },
          appraisalData,
          { new: true }
        );
      } else {
        // Regular user can only update their own appraisals
        appraisal = await AppraisalSchema.findOneAndUpdate(
          { _id: req.body._id, userId },
          appraisalData,
          { new: true }
        );
      }
      
      if (!appraisal) {
        return res.status(404).json({ message: 'Appraisal not found or you do not have permission to update it' });
      }
    } else {
      // Create new appraisal
      appraisal = new AppraisalSchema(appraisalData);
      await appraisal.save();
    }
    
    console.log('Appraisal saved successfully:', appraisal._id);
    res.json(appraisal);
  } catch (error) {
    console.error('Error saving appraisal:', error);
    
    // Provide more detailed error information
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      
      return res.status(400).json({ 
        message: 'Validation error', 
        validationErrors,
        error: error.message
      });
    }
    
    res.status(500).json({ message: 'Error saving appraisal', error: error.message });
  }
});

// Get all appraisals for the current user
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching appraisals for user: ${userId}`);
    
    const appraisals = await AppraisalSchema.find({ userId });
    console.log(`Found ${appraisals.length} appraisals for user ${userId}`);
    
    if (appraisals.length === 0) {
      console.log(`No appraisals found for user ${userId}. User may not have created any items yet.`);
    }
    
    res.json(appraisals);
  } catch (error) {
    console.error('Error fetching appraisals:', error);
    res.status(500).json({ message: 'Error fetching appraisals', error: error.message });
  }
});

// Get all appraisals for a specific user (admin only)
router.get('/user/:userId', auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Admin requesting appraisals for user: ${userId}`);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const appraisals = await AppraisalSchema.find({ userId });
    console.log(`Found ${appraisals.length} appraisals for user ${userId}`);
    
    res.json(appraisals);
  } catch (error) {
    console.error('Error fetching user appraisals:', error);
    res.status(500).json({ message: 'Error fetching user appraisals', error: error.message });
  }
});

// Get all appraisals (admin only)
router.get('/all', auth, isAdmin, async (req, res) => {
  try {
    const appraisals = await AppraisalSchema.find().sort({ timestamp: -1 });
    res.json(appraisals);
  } catch (error) {
    console.error('Error fetching all appraisals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all published appraisals for the showcase
router.get('/published', auth, async (req, res) => {
  try {
    console.log('Fetching published appraisals');
    const appraisals = await AppraisalSchema.find({ isPublished: true });
    console.log(`Found ${appraisals.length} published appraisals`);
    
    if (appraisals.length === 0) {
      console.log('No published appraisals found. Database may be empty or all items are unpublished.');
    }
    
    res.json(appraisals);
  } catch (error) {
    console.error('Error fetching published appraisals:', error);
    res.status(500).json({ message: 'Error fetching published appraisals', error: error.message });
  }
});

// Get a specific appraisal by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const appraisal = await AppraisalSchema.findById(req.params.id);
    
    if (!appraisal) {
      return res.status(404).json({ message: 'Appraisal not found' });
    }
    
    // Check if the user is the owner, an admin, or if the item is published
    if (
      appraisal.userId.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      !appraisal.isPublished
    ) {
      return res.status(403).json({ message: 'You do not have permission to view this appraisal' });
    }
    
    res.json(appraisal);
  } catch (error) {
    console.error('Error fetching appraisal:', error);
    res.status(500).json({ message: 'Error fetching appraisal', error: error.message });
  }
});

// Toggle the published status of an appraisal
router.patch('/:id/publish', auth, async (req, res) => {
  try {
    const { isPublished } = req.body;
    const userId = req.user.id;
    
    const appraisal = await AppraisalSchema.findOneAndUpdate(
      { _id: req.params.id, userId },
      { isPublished },
      { new: true }
    );
    
    if (!appraisal) {
      return res.status(404).json({ message: 'Appraisal not found or you do not have permission to update it' });
    }
    
    res.json(appraisal);
  } catch (error) {
    console.error('Error updating published status:', error);
    res.status(500).json({ message: 'Error updating published status', error: error.message });
  }
});

// Delete an appraisal
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Find the appraisal
    const appraisal = await AppraisalSchema.findById(req.params.id);
    
    if (!appraisal) {
      return res.status(404).json({ message: 'Appraisal not found' });
    }
    
    // Check if the user is the owner or an admin
    if (appraisal.userId.toString() !== userId && !isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to delete this appraisal' });
    }
    
    await AppraisalSchema.findByIdAndDelete(req.params.id);
    res.json({ message: 'Appraisal deleted successfully' });
  } catch (error) {
    console.error('Error deleting appraisal:', error);
    res.status(500).json({ message: 'Error deleting appraisal', error: error.message });
  }
});

// Test endpoint to check if there are any items in the database
router.get('/test', async (req, res) => {
  try {
    console.log('Testing appraisal database connection');
    
    // Check if the Appraisal model exists
    const modelNames = mongoose.modelNames();
    console.log('Available models:', modelNames);
    
    // Count all documents in the collection
    const count = await AppraisalSchema.countDocuments();
    console.log(`Total appraisals in database: ${count}`);
    
    // Get a sample of documents
    const sample = await AppraisalSchema.find().limit(5);
    console.log(`Sample appraisals (up to 5): ${sample.length}`);
    
    if (sample.length > 0) {
      console.log('Sample appraisal IDs:', sample.map(item => item._id));
    }
    
    res.json({ 
      success: true, 
      count, 
      sample: sample.map(item => ({
        id: item._id,
        name: item.name,
        userId: item.userId,
        isPublished: item.isPublished
      }))
    });
  } catch (error) {
    console.error('Error testing appraisal database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error testing appraisal database', 
      error: error.message 
    });
  }
});

module.exports = router; 