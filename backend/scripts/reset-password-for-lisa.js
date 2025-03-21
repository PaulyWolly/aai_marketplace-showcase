/**
 * Reset Password Script for Lisa
 * 
 * This script resets Lisa Blumenstein's password in the database.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

// User to reset password for
const userData = {
  email: 'lwelby.b@gmail.com',
  newPassword: 'TomatoSoup123'
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
    
    // Update the password directly in the database to bypass pre-save hooks
    console.log('Updating password directly...');
    const result = await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('Update result:', result);
    
    if (result.modifiedCount === 1) {
      console.log('Password updated successfully!');
      console.log(`User: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`New password: ${userData.newPassword}`);
      
      // Fetch the updated user to verify
      const updatedUser = await User.findById(user._id);
      
      // Verify the password was changed correctly
      console.log('Verifying new password...');
      const isMatch = await bcrypt.compare(userData.newPassword, updatedUser.password);
      if (isMatch) {
        console.log('✅ Password verification successful!');
      } else {
        console.log('❌ Password verification failed!');
      }
    } else {
      console.log('❌ Password update failed!');
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