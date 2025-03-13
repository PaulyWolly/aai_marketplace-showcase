/**
 * Quick Admin Password Reset Script
 * 
 * This script will find the first admin user and reset their password to 'PJW_1236'
 * No user interaction required - just run and go!
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Fixed password for simplicity
const NEW_PASSWORD = 'PJW_1236';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  console.log('Make sure you have a .env file in the backend directory with MONGODB_URI defined');
  process.exit(1);
}

async function quickResetAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the User model
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

    // Find the first admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('No admin user found. Creating a default admin user...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      // Create a new admin user
      const newAdmin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newAdmin.save();
      console.log('Created new admin user:');
      console.log('- Email: admin@example.com');
      console.log(`- Password: ${NEW_PASSWORD}`);
      
    } else {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      // Update the admin's password
      adminUser.password = hashedPassword;
      adminUser.updatedAt = new Date();
      await adminUser.save();
      
      console.log('Admin password reset successful!');
      console.log(`- User: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`);
      console.log(`- New password: ${NEW_PASSWORD}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    console.log('Done!');
    process.exit(0);
  }
}

// Run the script
quickResetAdmin(); 