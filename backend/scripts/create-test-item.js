/**
 * Script to create a test item in the database
 * Run with: node scripts/create-test-item.js
 */

const mongoose = require('mongoose');
const config = require('../config');

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect(config.mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define Appraisal Schema if it doesn't exist
let Appraisal;
try {
  Appraisal = mongoose.model('Appraisal');
} catch (error) {
  const AppraisalSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    name: { type: String, required: true },
    category: { type: String, default: 'Uncategorized' },
    condition: { type: String, default: 'Unknown' },
    estimatedValue: { type: String, default: 'Unknown' },
    imageUrl: { type: String, required: true },
    appraisal: {
      details: { type: String, required: true },
      marketResearch: { type: String, required: true }
    },
    isPublished: { type: Boolean, default: true }
  });
  
  Appraisal = mongoose.model('Appraisal', AppraisalSchema);
}

// Create a test item
const createTestItem = async () => {
  try {
    // Sample image URL (base64 encoded small gray square)
    const sampleImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAnElEQVR42u3RAQ0AAAjDMO5fNCCDkC5z0HTVrisFCBABASIgQAQEiIAAAQJEQIAICBABASIgQIAAERAgAgJEQIAICBAgQAQEiIAAERAgAgIECBABASIgQAQEiIAAAQJEQIAICBABASIgQIAAERAgAgJEQIAICBAgQAQEiIAAERAgAgIECBABASIgQAQEiIAAAQJEQIAICBABASIgQL4ClgAcTwABQQYkGAAAAABJRU5ErkJggg==';
    
    const testItem = new Appraisal({
      userId: '65f0e8d2e6c8a9b7c6d5e4f3', // Replace with a valid user ID from your database
      name: 'Test Item',
      category: 'Collectibles',
      condition: 'Good',
      estimatedValue: '$100-150',
      imageUrl: sampleImageUrl,
      appraisal: {
        details: '**Test Item Details**\n\nThis is a test item created to verify the database connection and item display functionality.\n\n- Material: Test Material\n- Age: New\n- Origin: Test Origin',
        marketResearch: '**Market Research**\n\nSimilar items typically sell for $100-150 in the current market.\n\n- Recent sales: $125 average\n- Trending: Stable'
      },
      isPublished: true,
      timestamp: new Date()
    });
    
    await testItem.save();
    console.log('Test item created successfully:', testItem._id);
    
    // Display the created item
    console.log('Item details:', {
      id: testItem._id,
      name: testItem.name,
      userId: testItem.userId,
      isPublished: testItem.isPublished
    });
    
  } catch (error) {
    console.error('Error creating test item:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the function
createTestItem(); 