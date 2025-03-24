/**
 * Fix Admin Login Script
 * 
 * This script performs a direct MongoDB update to fix the admin password
 * without using mongoose's save() method, which might be causing issues.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Admin email and password to set
const ADMIN_EMAIL = 'pwelby@gmail.com';
const NEW_PASSWORD = 'PJW_1236';

async function fixAdminLogin() {
  try {
    // Connect to MongoDB directly
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');
    
    // Get direct access to the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find the admin user
    const adminUser = await usersCollection.findOne({ email: ADMIN_EMAIL });
    
    if (!adminUser) {
      console.log(`No user found with email ${ADMIN_EMAIL}. Creating one...`);
      
      // Create a new admin user with properly hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      const result = await usersCollection.insertOne({
        firstName: 'Admin',
        lastName: 'User',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Created new admin user with ID:', result.insertedId);
    } else {
      console.log('Admin user found:', adminUser.email);
      
      // Hash the password using bcrypt directly
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      // Update the user's password directly in MongoDB
      const updateResult = await usersCollection.updateOne(
        { _id: adminUser._id },
        { 
          $set: { 
            password: hashedPassword,
            role: 'admin',
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('Update result:', updateResult);
      
      // Verify the update
      const updatedUser = await usersCollection.findOne({ email: ADMIN_EMAIL });
      console.log('User role:', updatedUser.role);
      console.log('Password hash length:', updatedUser.password.length);
      
      // Test password comparison
      const passwordMatch = await bcrypt.compare(NEW_PASSWORD, updatedUser.password);
      console.log('Test password comparison:', passwordMatch ? 'SUCCESS' : 'FAILED');
    }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
fixAdminLogin(); 