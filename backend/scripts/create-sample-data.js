/**
 * Sample Data Generator Script
 * 
 * This script creates sample users and items in the database for testing purposes.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');
const AppraisalSchema = mongoose.model('Appraisal');

// Sample users to create
const sampleUsers = [
  {
    firstName: 'Lisa',
    lastName: 'Blumenstein',
    email: 'lisa@example.com',
    password: 'password123',
    role: 'user'
  }
];

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
  }
];

async function createSampleData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Create users if they don't exist
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        console.log(`Creating user: ${userData.firstName} ${userData.lastName}`);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        const newUser = new User({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newUser.save();
        console.log(`Created user: ${userData.email}`);
      } else {
        console.log(`User ${userData.email} already exists`);
      }
    }

    // Get all users to associate items with
    const users = await User.find();
    console.log(`Found ${users.length} users in the database`);

    if (users.length === 0) {
      console.log('No users found. Items need users to be associated with.');
      return;
    }

    // Create items for each user
    let itemsCreated = 0;
    
    for (const user of users) {
      console.log(`Creating items for user: ${user.firstName} ${user.lastName}`);
      
      for (const itemData of sampleItems) {
        // Create a unique name by adding a random suffix
        const uniqueName = `${itemData.name} ${Math.floor(Math.random() * 1000)}`;
        
        const newItem = new AppraisalSchema({
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
        console.log(`Created item: ${uniqueName} for user ${user.email}`);
      }
    }

    console.log(`Successfully created ${itemsCreated} sample items`);
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
createSampleData(); 