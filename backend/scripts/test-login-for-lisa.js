/**
 * Test Login Script for Lisa
 * 
 * This script tests Lisa Blumenstein's login directly against the database.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

// User credentials to test
const credentials = {
  email: 'lwelby.b@gmail.com',
  password: 'TomatoSoup123'
};

async function testLogin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Find user by email (case-insensitive)
    console.log(`Looking for user with email: ${credentials.email}`);
    const user = await User.findOne({ email: { $regex: new RegExp(`^${credentials.email}$`, 'i') } });
    
    if (!user) {
      console.log('User not found in database!');
      console.log('Available users:');
      const allUsers = await User.find({}, 'email');
      allUsers.forEach(u => console.log(` - ${u.email}`));
      return;
    }
    
    console.log(`User found: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`User role: ${user.role}`);
    console.log(`Password hash length: ${user.password.length}`);
    
    // Test password
    console.log('Testing password...');
    const isMatch = await bcrypt.compare(credentials.password, user.password);
    
    if (isMatch) {
      console.log('✅ Password match successful!');
      console.log('Login credentials are correct.');
    } else {
      console.log('❌ Password does not match!');
      console.log('Login would fail with these credentials.');
    }
    
  } catch (error) {
    console.error('Error testing login:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the test
testLogin(); 