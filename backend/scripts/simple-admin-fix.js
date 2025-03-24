/**
 * Simple Admin Fix Script
 * 
 * Minimal script to reset admin password
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Constants
const EMAIL = 'pwelby@gmail.com';
const PASSWORD = 'PJW_1236';

async function fixAdmin() {
  let client;
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', config.mongoURI);
    
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const userCollection = db.collection('users');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(PASSWORD, salt);
    console.log('Generated password hash:', passwordHash);
    
    // Find user
    const user = await userCollection.findOne({ email: EMAIL });
    
    if (user) {
      console.log('User found:', user.email);
      console.log('Updating password...');
      
      // Update user password
      const updateResult = await userCollection.updateOne(
        { email: EMAIL },
        { $set: { password: passwordHash, role: 'admin' } }
      );
      
      console.log('Update result:', updateResult);
      
      // Verify password works
      const updatedUser = await userCollection.findOne({ email: EMAIL });
      const isPasswordValid = await bcrypt.compare(PASSWORD, updatedUser.password);
      
      console.log('Password verification:', isPasswordValid ? 'SUCCESS' : 'FAILED');
    } else {
      console.log('User not found, creating new admin user');
      
      // Create new user
      const newUser = {
        email: EMAIL,
        password: passwordHash,
        firstName: 'Paul',
        lastName: 'Welby',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const insertResult = await userCollection.insertOne(newUser);
      console.log('Insert result:', insertResult);
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

fixAdmin(); 