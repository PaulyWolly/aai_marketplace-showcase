/**
 * Update Silver Jewelry Box Image
 * 
 * This script updates the image URL for the Silver Jewelry Box item
 * to use a working image URL.
 */

const mongoose = require('mongoose');
const config = require('../config');
const appraisalSchema = require('../models/appraisal.model');

// New working image URL from Unsplash
const newImageUrl = 'https://images.unsplash.com/photo-1608042314453-ae338d80c427'; // Jewelry box image

async function updateItemImage() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Find the Silver Jewelry Box item
    const item = await appraisalSchema.findOne({ name: /Silver Jewelry Box/i });
    
    if (!item) {
      console.log('Silver Jewelry Box item not found');
      return;
    }
    
    console.log(`Found item: ${item.name}`);
    console.log(`Current image URL: ${item.imageUrl}`);
    
    // Update the image URL
    item.imageUrl = newImageUrl;
    await item.save();
    
    console.log('Image URL updated successfully');
    console.log(`New image URL: ${newImageUrl}`);
    
  } catch (error) {
    console.error('Error updating image URL:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
updateItemImage(); 