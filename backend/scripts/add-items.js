/**
 * Add Sample Items Script
 * 
 * This script adds sample items for all users in the database.
 */

const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');

// Import the Appraisal model from file
// If your model is defined in a separate file, you'd need to import it
// For now, we'll define the schema here similar to how it's done in your application
const appraisalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  title: { type: String },
  category: { type: String, default: 'Uncategorized' },
  condition: { type: String, default: 'Unknown' },
  estimatedValue: { type: String, default: 'Unknown' },
  imageUrl: { type: String },
  appraisal: {
    details: { type: String, required: true },
    marketResearch: { type: String, required: true }
  },
  timestamp: { type: Date, default: Date.now },
  isPublished: { type: Boolean, default: true }
});

// Register the model
const AppraisalModel = mongoose.model('Appraisal', appraisalSchema);

async function addSampleItems() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find();
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log('No users found. Items need users to be associated with.');
      return;
    }

    // Sample items to create
    const sampleItems = [
      {
        name: 'Antique Vase',
        category: 'Decorative Art',
        condition: 'Good',
        estimatedValue: '$500-750',
        description: 'Chinese porcelain vase from the early 20th century with blue and white design',
        imageUrl: 'https://images.unsplash.com/photo-1544918877-460635b6d13e'
      },
      {
        name: 'Vintage Watch',
        category: 'Jewelry',
        condition: 'Excellent',
        estimatedValue: '$1,200-1,800',
        description: 'Men\'s Omega Seamaster from the 1960s in working condition',
        imageUrl: 'https://images.unsplash.com/photo-1539874754764-5a96559165b0'
      },
      {
        name: 'Mid-Century Chair',
        category: 'Furniture',
        condition: 'Fair',
        estimatedValue: '$350-500',
        description: 'Eames-style lounge chair with visible wear but solid structure',
        imageUrl: 'https://images.unsplash.com/photo-1506898667547-42e22a46e125'
      },
      {
        name: 'Silver Jewelry Box',
        category: 'Collectibles',
        condition: 'Very Good',
        estimatedValue: '$200-300',
        description: 'Victorian silver-plated jewelry box with velvet lining',
        imageUrl: 'https://images.unsplash.com/photo-1633555715049-eb419265c0e4'
      },
      {
        name: 'Vintage Camera',
        category: 'Electronics',
        condition: 'Fair',
        estimatedValue: '$150-250',
        description: 'Kodak Brownie camera from the 1950s',
        imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32'
      }
    ];

    // Create items for each user
    let totalItemsCreated = 0;
    
    for (const user of users) {
      console.log(`Creating items for user: ${user.firstName} ${user.lastName} (${user.email})`);
      
      // Get number of existing items for this user
      const existingItemCount = await AppraisalModel.countDocuments({ userId: user._id });
      console.log(`User currently has ${existingItemCount} items`);

      // Add 3 random items for each user
      const itemsToCreate = 3;
      let itemsCreated = 0;
      
      for (let i = 0; i < itemsToCreate; i++) {
        // Pick a random item from the sample items
        const randomIndex = Math.floor(Math.random() * sampleItems.length);
        const itemData = sampleItems[randomIndex];
        
        // Create a unique name by adding a random suffix
        const uniqueName = `${itemData.name} ${Math.floor(Math.random() * 1000)}`;
        
        const newItem = new AppraisalModel({
          userId: user._id,
          name: uniqueName,
          title: uniqueName,
          category: itemData.category,
          condition: itemData.condition,
          estimatedValue: itemData.estimatedValue,
          imageUrl: itemData.imageUrl,
          appraisal: {
            details: itemData.description,
            marketResearch: `Based on similar items, the ${uniqueName} has an estimated value of ${itemData.estimatedValue}.`
          },
          timestamp: new Date(),
          isPublished: true
        });
        
        await newItem.save();
        itemsCreated++;
        totalItemsCreated++;
        console.log(`Created item: ${uniqueName} for user ${user.email}`);
      }
      
      console.log(`Created ${itemsCreated} items for ${user.email}`);
    }

    console.log(`Successfully created ${totalItemsCreated} sample items`);
    
  } catch (error) {
    console.error('Error creating sample items:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
addSampleItems(); 