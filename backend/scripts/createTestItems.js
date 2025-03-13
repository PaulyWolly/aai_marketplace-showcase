const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item = require('../models/Item');
const User = require('../models/User');
const connectDB = require('../config/database');

const sampleItems = [
  {
    name: 'Vintage Camera',
    price: 299.99,
    description: 'A beautiful vintage camera in excellent condition. Perfect for collectors or photography enthusiasts.',
    imageUrl: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848',
    category: 'Electronics'
  },
  {
    name: 'Leather Messenger Bag',
    price: 149.99,
    description: 'Handcrafted leather messenger bag. Perfect for daily use or business meetings.',
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
    category: 'Accessories'
  },
  {
    name: 'Mechanical Keyboard',
    price: 199.99,
    description: 'Professional mechanical keyboard with RGB backlight and Cherry MX switches.',
    imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212',
    category: 'Electronics'
  }
];

const createTestItems = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Clear existing items
    await Item.deleteMany({});
    console.log('Cleared existing items');

    // Get the admin user to set as seller
    const adminUser = await User.findOne({ email: 'pwelby@gmail.com' });
    if (!adminUser) {
      throw new Error('Admin user not found. Please run createUsers.js first.');
    }

    // Create items
    const items = await Promise.all(
      sampleItems.map(item => 
        Item.create({
          ...item,
          sellerId: adminUser._id
        })
      )
    );

    console.log('Created test items:', items);
    console.log('\nTest items have been added to the database.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test items:', error);
    process.exit(1);
  }
};

createTestItems(); 