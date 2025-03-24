const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

// Admin email and new password
const ADMIN_EMAIL = 'pwelby@gmail.com';
const NEW_PASSWORD = 'PJW_1236';

async function resetSpecificAdminPassword() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI:', config.mongoURI);
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');
    console.log('Database:', mongoose.connection.name);

    // Find the specific admin user
    const adminUser = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!adminUser) {
      console.log(`No user found with email ${ADMIN_EMAIL}`);
      console.log('Creating a new admin user...');
      
      // Create a new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      const newAdmin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newAdmin.save();
      console.log('New admin user created:');
      console.log('Email:', newAdmin.email);
      console.log('Password:', NEW_PASSWORD);
    } else {
      console.log('User found:', adminUser.email);
      console.log('Current role:', adminUser.role);
      
      // Ensure the user has admin role
      if (adminUser.role !== 'admin') {
        console.log('Updating user role to admin');
        adminUser.role = 'admin';
      }
      
      // Reset password using direct bcrypt methods
      console.log('Resetting password...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      // Update the user document directly
      const result = await User.updateOne(
        { _id: adminUser._id },
        { 
          $set: { 
            password: hashedPassword,
            role: 'admin',
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('Update result:', result);
      console.log('Password reset successfully');
      console.log('Email:', ADMIN_EMAIL);
      console.log('New password:', NEW_PASSWORD);
      
      // Verify the update
      const updatedUser = await User.findOne({ email: ADMIN_EMAIL });
      console.log('Updated user role:', updatedUser.role);
      console.log('Password hash length:', updatedUser.password.length);
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
resetSpecificAdminPassword(); 