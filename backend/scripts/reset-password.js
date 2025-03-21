/**
 * Reset Password Script
 * 
 * This script resets a user's password in the database.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

// User to reset password for
const userData = {
  email: 'lwelby.b@gmail.com',
  newPassword: 'LisaB123!'
};

async function resetPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Find user by email
    console.log(`Looking for user with email: ${userData.email}`);
    const user = await User.findOne({ email: userData.email });
      
    if (!user) {
      console.log(`User ${userData.email} not found in database!`);
      return;
    }
    
    console.log(`User found: ${user.firstName} ${user.lastName} (${user.email})`);
    
    // Hash the new password
    console.log('Hashing new password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.newPassword, salt);
    
    // Update the user's password
    console.log('Updating password...');
    user.password = hashedPassword;
    await user.save();
    
    console.log('Password updated successfully!');
    console.log(`User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`New password: ${userData.newPassword}`);
    
    // Verify the password was changed correctly
    console.log('Verifying new password...');
    const isMatch = await bcrypt.compare(userData.newPassword, user.password);
    if (isMatch) {
      console.log('✅ Password verification successful!');
    } else {
      console.log('❌ Password verification failed!');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
resetPassword(); 