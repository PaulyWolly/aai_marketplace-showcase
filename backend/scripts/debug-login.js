/**
 * Debug Login Script
 * 
 * This script tests the login process directly by:
 * 1. Finding the admin user
 * 2. Testing the password comparison
 * 3. Showing detailed debug information
 * 
 * Usage: node debug-login.js <email> <password>
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Get credentials from command line
const args = process.argv.slice(2);
const email = args[0] || 'pwelby@gmail.com'; // Default to admin email
const password = args[1] || 'PJW_1236'; // Default to the password we set

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function debugLogin() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Using connection string:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Load User model from the actual models file
    const User = require('../models/User');
    
    console.log('\n--- FINDING USER ---');
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`User with email ${email} not found in the database`);
      console.log('\nAvailable users:');
      const users = await User.find({}).select('email role');
      users.forEach(u => console.log(`- ${u.email} (${u.role})`));
      return;
    }
    
    console.log(`User found: ${user.email} (${user.role})`);
    console.log('User details:', {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      passwordLength: user.password.length,
      passwordHash: user.password.substring(0, 20) + '...',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    
    console.log('\n--- TESTING PASSWORD ---');
    console.log(`Testing password: "${password}" (length: ${password.length})`);
    
    // Test direct bcrypt comparison
    console.log('\nDirect bcrypt comparison:');
    try {
      const isMatchDirect = await bcrypt.compare(password, user.password);
      console.log(`Result: ${isMatchDirect ? 'SUCCESS ✓' : 'FAILED ✗'}`);
    } catch (error) {
      console.error('Error in direct comparison:', error.message);
    }
    
    // Test model's comparePassword method if it exists
    if (typeof user.comparePassword === 'function') {
      console.log('\nModel comparePassword method:');
      try {
        const isMatchModel = await user.comparePassword(password);
        console.log(`Result: ${isMatchModel ? 'SUCCESS ✓' : 'FAILED ✗'}`);
      } catch (error) {
        console.error('Error in model comparison:', error.message);
      }
    } else {
      console.log('\nModel comparePassword method not found');
    }
    
    // Generate a new hash for the password for verification
    console.log('\nGenerating new hash for the same password:');
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(password, salt);
    console.log(`New hash: ${newHash.substring(0, 20)}...`);
    
    // Test if the new hash would work
    const isMatchNewHash = await bcrypt.compare(password, newHash);
    console.log(`New hash verification: ${isMatchNewHash ? 'SUCCESS ✓' : 'FAILED ✗'}`);
    
    // Suggest next steps
    console.log('\n--- RECOMMENDATIONS ---');
    if (await bcrypt.compare(password, user.password)) {
      console.log('✅ Password is correct. If you still cannot log in:');
      console.log('1. Check if the frontend is sending the correct credentials');
      console.log('2. Check for any JWT or session issues');
      console.log('3. Verify that the login route is working properly');
    } else {
      console.log('❌ Password is incorrect. Try these steps:');
      console.log('1. Reset the password again using the quick-reset-admin.js script');
      console.log('2. Check for any whitespace or special characters in the password');
      console.log('3. Try a simpler password temporarily for testing');
      
      // Update the password with a new hash
      console.log('\nWould you like to update the password now? (y/n)');
      process.stdin.once('data', async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          user.password = newHash;
          user.updatedAt = new Date();
          await user.save();
          console.log(`Password updated successfully to: ${password}`);
        } else {
          console.log('Password not updated');
        }
        
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      });
      return; // Don't close connection yet
    }

  } catch (error) {
    console.error('Error debugging login:', error);
  } finally {
    if (!process.stdin.listenerCount('data')) {
      // Only close if we're not waiting for user input
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    }
  }
}

// Run the script
debugLogin(); 