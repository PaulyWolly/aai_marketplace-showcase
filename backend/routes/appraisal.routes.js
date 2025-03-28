const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, isAdmin } = require('../middleware/auth');
const Appraisal = require('../models/appraisal.model');
const openAIService = require('../services/openai.service');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

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

/**
 * Helper function to deduplicate images array
 * Only removes exact duplicates within the images array itself
 * Does NOT remove images that match the main imageUrl
 * 
 * @param {Array} imagesArray - Array of image URLs
 * @returns {Array} - Array with duplicates removed
 */
function deduplicateImages(imagesArray) {
  if (!imagesArray || !Array.isArray(imagesArray)) {
    console.log('deduplicateImages: No imagesArray or not an array, returning empty array');
    return [];
  }

  // Filter out empty/null entries
  const filteredArray = imagesArray.filter(url => url && typeof url === 'string' && url.trim() !== '');
  console.log(`deduplicateImages: Filtered out empty entries: ${imagesArray.length} -> ${filteredArray.length}`);

  // Use a Set to track seen URLs and only remove exact duplicates
  const seen = new Set();
  const uniqueImages = filteredArray.filter(url => {
    // Only check for duplicates within the array itself
    if (seen.has(url)) {
      console.log(`deduplicateImages: Found duplicate URL: ${url}`);
      return false;
    }
    seen.add(url);
    return true;
  });

  console.log(`deduplicateImages: Final unique image count: ${uniqueImages.length}`);
  return uniqueImages;
}

// Save appraisal (create or update)
router.post('/save', upload.single('file'), async (req, res) => {
  try {
    console.log('POST /save - Create or update appraisal');
    
    // Debug logging
    console.log('Form fields:', req.body);
    if (req.file) {
      console.log('Uploaded file:', req.file.filename);
    } else {
      console.log('No file uploaded with this request');
    }
    
    // Ensure required fields are present
    if (!req.body.item) {
      return res.status(400).json({ message: 'Missing required field: item' });
    }
    
    // Parse form fields
    const appraisalData = { ...req.body };
    const isUpdate = !!appraisalData._id;
    
    // Handle nested JSON objects in form data
    ['item', 'location', 'condition', 'pricing', 'review', 'specs'].forEach(field => {
      if (typeof appraisalData[field] === 'string') {
        try {
          appraisalData[field] = JSON.parse(appraisalData[field]);
        } catch (e) {
          console.log(`Error parsing ${field} JSON:`, e.message);
        }
      }
    });
    
    // Fix imageUrl if it's an array
    if (Array.isArray(appraisalData.imageUrl)) {
      console.log('Warning: imageUrl is an array - fixing by taking first element');
      appraisalData.imageUrl = appraisalData.imageUrl.length > 0 ? appraisalData.imageUrl[0] : '';
    }
    
    // Parse images array if it's a string
    if (typeof appraisalData.images === 'string') {
      try {
        console.log('Parsing images string:', appraisalData.images);
        appraisalData.images = JSON.parse(appraisalData.images);
        console.log('Parsed images array:', appraisalData.images);
      } catch (e) {
        console.log('Error parsing images JSON:', e.message);
        // Initialize as empty array if parsing fails
        appraisalData.images = [];
      }
    }
    
    // Get existing appraisal if this is an update
    let existingAppraisal = null;
    if (isUpdate) {
      existingAppraisal = await AppraisalSchema.findById(appraisalData._id);
      
      if (!existingAppraisal) {
        return res.status(404).json({ message: 'Appraisal not found for update' });
      }
      
      console.log('Existing imageUrl:', existingAppraisal.imageUrl);
      console.log('Existing images array:', existingAppraisal.images);
      
      // If no images array provided in the request, use existing images from database
      if (!appraisalData.images || !Array.isArray(appraisalData.images)) {
        console.log('No images array in request - using existing images from database');
        appraisalData.images = existingAppraisal.images || [];
      }
    } else {
      // For new appraisals, initialize empty array if not provided
      if (!appraisalData.images) {
        appraisalData.images = [];
      }
    }
    
    // If there's a new file uploaded, add it to the appraisal
    if (req.file) {
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      console.log('New uploaded image URL:', imageUrl);
      
      // Set as main image if requested, if there is no main image, or for new appraisals
      const setMainImage = req.body.setMainImage === 'true';
      if (setMainImage || !appraisalData.imageUrl || !existingAppraisal) {
        console.log('Setting uploaded image as main imageUrl');
        appraisalData.imageUrl = imageUrl;
      } else if (existingAppraisal && !appraisalData.imageUrl) {
        // Otherwise, keep the existing main image
        console.log('Preserving existing main imageUrl:', existingAppraisal.imageUrl);
        appraisalData.imageUrl = existingAppraisal.imageUrl;
      }
      
      // Always add the new image to the images array
      console.log('Adding new image to images array');
      appraisalData.images.push(imageUrl);
      console.log(`Images array now has ${appraisalData.images.length} images`);
    } else if (existingAppraisal && !appraisalData.imageUrl) {
      // If no new image and no imageUrl in request, preserve existing imageUrl for updates
      console.log('No new image uploaded - preserving existing imageUrl');
      appraisalData.imageUrl = existingAppraisal.imageUrl;
    }
    
    // Deduplicate the images array to avoid showing the same image multiple times
    const originalCount = Array.isArray(appraisalData.images) ? appraisalData.images.length : 0;
    appraisalData.images = deduplicateImages(appraisalData.images);
    console.log(`Deduplicated images array: ${originalCount} → ${appraisalData.images.length} images`);
    console.log('Final images array:', appraisalData.images);
    
    let result;
    if (isUpdate) {
      // Update existing appraisal
      result = await AppraisalSchema.findByIdAndUpdate(
        appraisalData._id,
        appraisalData,
        { new: true }
      );
      console.log('Appraisal updated successfully');
    } else {
      // Set userId based on authenticated user or default to system
      appraisalData.userId = req.user?.id || 'system';
      
      // Create new appraisal
      const newAppraisal = new AppraisalSchema(appraisalData);
      result = await newAppraisal.save();
      console.log('New appraisal created successfully');
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error saving appraisal:', error);
    res.status(500).json({ message: 'Error saving appraisal', error: error.message });
  }
});

// Get all appraisals for the current user
router.get('/user', auth, async (req, res) => {
  try {
    const appraisals = await AppraisalSchema.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(appraisals);
  } catch (error) {
    console.error('Error fetching user appraisals:', error);
    res.status(500).json({ message: 'Server error' });
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

// Get published appraisals
router.get('/published', async (req, res) => {
  try {
    const appraisals = await AppraisalSchema.find({ isPublished: true })
      .sort({ timestamp: -1 });
    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching published appraisals', error: error.message });
  }
});

// Get a specific appraisal by ID
router.get('/:id', auth, async (req, res) => {
  try {
    console.log(`Fetching appraisal with ID: ${req.params.id}`);
    
    // Use lean() to get a plain JavaScript object instead of a full Mongoose document
    // This is much faster for read-only operations
    const appraisal = await AppraisalSchema.findById(req.params.id).lean();
    
    if (!appraisal) {
      console.log(`Appraisal with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Appraisal not found' });
    }
    
    // Check if the user is the owner, an admin, or if the item is published
    if (
      appraisal.userId.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      !appraisal.isPublished
    ) {
      console.log(`User ${req.user.id} tried to access unauthorized appraisal ${req.params.id}`);
      return res.status(403).json({ message: 'You do not have permission to view this appraisal' });
    }
    
    console.log(`Successfully retrieved appraisal ${req.params.id}`);
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

// Create or update appraisal with image upload
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    console.log('Received multipart form data with image');
    console.log('Form fields:', req.body);
    console.log('File:', req.file);
    
    // Parse any JSON fields that were sent as strings
    let appraisalData = { ...req.body };
    
    // Handle nested JSON objects that might be stringified
    if (typeof req.body.appraisal === 'string') {
      try {
        appraisalData.appraisal = JSON.parse(req.body.appraisal);
      } catch (err) {
        console.error('Error parsing appraisal JSON:', err);
      }
    }
    
    // Fix imageUrl if it's an array (take the first element)
    if (Array.isArray(appraisalData.imageUrl)) {
      console.log('imageUrl is an array, fixing by taking first element:', appraisalData.imageUrl);
      appraisalData.imageUrl = appraisalData.imageUrl.length > 0 ? appraisalData.imageUrl[0] : '';
    }
    
    // Add image URL if file was uploaded
    if (req.file) {
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      
      // If updating an existing appraisal, preserve its main image URL unless explicitly overwriting
      if (appraisalData._id && !appraisalData.setMainImage) {
        // Keep the existing imageUrl if available
        console.log('Preserving existing main imageUrl for update');
      } else {
        // Set uploaded image as the main image
        appraisalData.imageUrl = imageUrl;
        console.log(`Set new main imageUrl: ${imageUrl}`);
      }
      
      // Initialize or update images array
      if (!appraisalData.images) {
        // If updating an existing appraisal, get its images first
        if (appraisalData._id) {
          const existingAppraisal = await AppraisalSchema.findById(appraisalData._id);
          appraisalData.images = existingAppraisal ? [...existingAppraisal.images] : [];
        } else {
          appraisalData.images = [];
        }
      } else if (typeof appraisalData.images === 'string') {
        try {
          appraisalData.images = JSON.parse(appraisalData.images);
        } catch (err) {
          // If updating an existing appraisal, get its images
          if (appraisalData._id) {
            const existingAppraisal = await AppraisalSchema.findById(appraisalData._id);
            appraisalData.images = existingAppraisal ? [...existingAppraisal.images] : [];
          } else {
            appraisalData.images = [];
          }
        }
      }
      
      // Always add the new image to the images array
      appraisalData.images.push(imageUrl);
      console.log(`Added new image to images array. Now contains ${appraisalData.images.length} images.`);
    }
    
    // Ensure timestamp is set
    appraisalData.timestamp = appraisalData.timestamp || new Date();
    
    // Set isPublished status
    appraisalData.isPublished = appraisalData.isPublished !== undefined ? appraisalData.isPublished : true;
    
    // If not admin, always set userId to current user
    // If admin, preserve the original userId if it exists
    if (!isAdmin || !appraisalData.userId) {
      appraisalData.userId = userId;
    }
    
    // Deduplicate the images array to avoid showing the same image multiple times
    // We need to keep imageUrl separate as the main image
    appraisalData.images = deduplicateImages(appraisalData.images);
    console.log(`Final images array after deduplication: ${appraisalData.images.length} images`);
    
    // Verify required fields
    const requiredFields = ['name', 'category', 'condition', 'estimatedValue', 'appraisal'];
    const missingFields = requiredFields.filter(field => !appraisalData[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields,
        received: Object.keys(appraisalData)
      });
    }
    
    // Ensure appraisal object has required fields
    if (!appraisalData.appraisal.details || !appraisalData.appraisal.marketResearch) {
      console.error('Missing required appraisal fields');
      return res.status(400).json({
        message: 'Missing required appraisal fields',
        missingFields: [
          !appraisalData.appraisal.details ? 'appraisal.details' : null,
          !appraisalData.appraisal.marketResearch ? 'appraisal.marketResearch' : null
        ].filter(Boolean)
      });
    }
    
    // Check if we need to update or create
    let appraisal;
    
    if (appraisalData._id) {
      // Update existing appraisal
      console.log(`Updating existing appraisal: ${appraisalData._id}`);
      
      if (isAdmin) {
        // Admin can update any appraisal
        appraisal = await AppraisalSchema.findOneAndUpdate(
          { _id: appraisalData._id },
          appraisalData,
          { new: true }
        );
      } else {
        // Regular user can only update their own appraisals
        appraisal = await AppraisalSchema.findOneAndUpdate(
          { _id: appraisalData._id, userId },
          appraisalData,
          { new: true }
        );
      }
      
      if (!appraisal) {
        return res.status(404).json({ message: 'Appraisal not found or you do not have permission to update it' });
      }
    } else {
      // Create new appraisal
      console.log('Creating new appraisal');
      appraisal = new AppraisalSchema(appraisalData);
      await appraisal.save();
    }
    
    console.log('Appraisal saved successfully:', appraisal._id);
    res.json(appraisal);
  } catch (error) {
    console.error('Error saving appraisal with image:', error);
    
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

// Update an appraisal
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    console.log(`PUT /${req.params.id} - Update appraisal`);
    console.log('User ID from auth:', req.user?.id);
    const appraisalId = req.params.id;
    
    // Debug logging
    console.log('Form fields:', req.body);
    if (req.file) {
      console.log('Uploaded file:', req.file.filename);
    } else {
      console.log('No file uploaded with this request');
    }
    
    // Get the existing appraisal data first
    const existingAppraisal = await AppraisalSchema.findById(appraisalId);
    if (!existingAppraisal) {
      return res.status(404).json({ message: 'Appraisal not found' });
    }
    
    // Check ownership or admin status for permission
    if (req.user.role !== 'admin' && existingAppraisal.userId !== req.user.id) {
      console.log('Permission denied - user is not the owner or admin');
      console.log('Appraisal userId:', existingAppraisal.userId);
      console.log('Request user id:', req.user.id);
      return res.status(403).json({ message: 'You do not have permission to update this appraisal' });
    }
    
    // Parse form fields
    const appraisalData = { ...req.body };
    
    // Debug existing images
    console.log('Existing imageUrl:', existingAppraisal.imageUrl);
    console.log('Existing images array:', existingAppraisal.images);
    
    // Handle nested JSON objects in form data
    ['item', 'location', 'condition', 'pricing', 'review', 'specs', 'appraisal'].forEach(field => {
      if (typeof appraisalData[field] === 'string') {
        try {
          appraisalData[field] = JSON.parse(appraisalData[field]);
        } catch (e) {
          console.log(`Error parsing ${field} JSON:`, e.message);
        }
      }
    });
    
    // Parse images array if it's a string
    if (typeof appraisalData.images === 'string') {
      try {
        console.log('Parsing images string:', appraisalData.images);
        appraisalData.images = JSON.parse(appraisalData.images);
        console.log('Parsed images array:', appraisalData.images);
      } catch (e) {
        console.log('Error parsing images JSON:', e.message);
        // Initialize as empty array if parsing fails
        appraisalData.images = [];
      }
    }
    
    // If no images array provided in the request, use existing images from database
    if (!appraisalData.images || !Array.isArray(appraisalData.images)) {
      console.log('No images array in request - using existing images from database');
      appraisalData.images = existingAppraisal.images || [];
    }
    
    // If there's a new file uploaded, add it to the appraisal
    if (req.file) {
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      console.log('New uploaded image URL:', imageUrl);
      
      // Set as main image if requested or if there is no main image
      const setMainImage = req.body.setMainImage === 'true';
      if (setMainImage || !existingAppraisal.imageUrl) {
        console.log('Setting uploaded image as main imageUrl');
        appraisalData.imageUrl = imageUrl;
      } else {
        // Otherwise, keep the existing main image
        console.log('Preserving existing main imageUrl:', existingAppraisal.imageUrl);
        appraisalData.imageUrl = existingAppraisal.imageUrl;
      }
      
      // Always add the new image to the images array
      console.log('Adding new image to images array');
      appraisalData.images.push(imageUrl);
      console.log(`Images array now has ${appraisalData.images.length} images`);
    } else if (!appraisalData.imageUrl) {
      // If no new image and no imageUrl in request, preserve existing imageUrl
      console.log('No new image uploaded - preserving existing imageUrl');
      appraisalData.imageUrl = existingAppraisal.imageUrl;
    }
    
    // Fix imageUrl if it's an array
    if (Array.isArray(appraisalData.imageUrl)) {
      console.log('Warning: imageUrl is an array - fixing by taking first element');
      appraisalData.imageUrl = appraisalData.imageUrl.length > 0 ? appraisalData.imageUrl[0] : '';
    }
    
    // Deduplicate the images array to avoid showing the same image multiple times
    const originalCount = Array.isArray(appraisalData.images) ? appraisalData.images.length : 0;
    appraisalData.images = deduplicateImages(appraisalData.images);
    console.log(`Deduplicated images array: ${originalCount} → ${appraisalData.images.length} images`);
    console.log('Final images array:', appraisalData.images);
    
    // Update the appraisal
    const updatedAppraisal = await AppraisalSchema.findByIdAndUpdate(
      appraisalId,
      appraisalData,
      { new: true }
    );
    
    console.log('Appraisal updated successfully');
    res.status(200).json(updatedAppraisal);
  } catch (error) {
    console.error('Error updating appraisal:', error);
    res.status(500).json({ message: 'Error updating appraisal', error: error.message });
  }
});

// Reassign an appraisal to a different user (admin only)
router.patch('/:id/reassign', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'New user ID is required' });
    }

    const appraisal = await AppraisalSchema.findById(id);
    if (!appraisal) {
      return res.status(404).json({ message: 'Appraisal not found' });
    }

    appraisal.userId = userId;
    await appraisal.save();

    res.json({ message: 'Appraisal reassigned successfully', appraisal });
  } catch (error) {
    console.error('Error reassigning appraisal:', error);
    res.status(500).json({ message: 'Error reassigning appraisal', error: error.message });
  }
});

module.exports = router; 