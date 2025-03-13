/**
 * Script to reset admin password in MongoDB
 * 
 * This script will find all users with the 'admin' role and reset their passwords
 * to the specified password or a default password.
 * 
 * Usage: 
 * node reset-admin-password.js [new_password]
 * 
 * If no password is provided, it will use 'admin123' as the default.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Get password from command line or use default
const newPassword = process.argv[2] || 'admin123';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  console.log('Current directory:', __dirname);
  console.log('Available environment variables:', Object.keys(process.env).filter(key => !key.includes('SECRET')));
  process.exit(1);
}

async function resetAdminPasswords() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Using connection string:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Load the User model directly from your existing models
    // This avoids schema conflicts
    let User;
    try {
      User = mongoose.model('User');
    } catch (e) {
      // If model doesn't exist, define it
      const userSchema = new mongoose.Schema({
        firstName: String,
        lastName: String,
        email: String,
        password: String,
        role: String,
        createdAt: Date,
        updatedAt: Date
      });
      User = mongoose.model('User', userSchema);
    }

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    
    if (adminUsers.length === 0) {
      console.log('No admin users found in the database');
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update passwords for all admin users
    const updatePromises = adminUsers.map(async (user) => {
      user.password = hashedPassword;
      user.updatedAt = new Date();
      await user.save();
      return user;
    });

    const updatedUsers = await Promise.all(updatePromises);
    
    console.log(`\nPassword reset successful for ${updatedUsers.length} admin users:`);
    updatedUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email})`);
    });
    
    console.log(`\nNew password: ${newPassword}`);
    console.log('You can now log in with this password');

  } catch (error) {
    console.error('Error resetting admin passwords:', error);
  } finally {
    // Close the MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Run the script
resetAdminPasswords(); 