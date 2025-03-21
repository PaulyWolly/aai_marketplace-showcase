/**
 * Add User Script
 * 
 * This script adds a specific user to the database.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

// User to add
const userData = {
  firstName: 'Lisa',
  lastName: 'Blumenstein',
  email: 'lwelby.b@gmail.com',
  password: 'TomatoSoup123',
  role: 'user'
};

async function addUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
      
    if (!existingUser) {
      console.log(`Creating user: ${userData.firstName} ${userData.lastName}`);
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const newUser = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newUser.save();
      console.log(`Successfully created user: ${userData.email}`);
      console.log(`User details: ${userData.firstName} ${userData.lastName} (${userData.role})`);
      console.log(`Email: ${userData.email}`);
      console.log(`Password: ${userData.password}`);
    } else {
      console.log(`User ${userData.email} already exists`);
      
      // Update the user
      console.log('Updating user...');
      existingUser.firstName = userData.firstName;
      existingUser.lastName = userData.lastName;
      existingUser.role = userData.role;
      
      // Update password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      existingUser.password = hashedPassword;
      
      existingUser.updatedAt = new Date();
      await existingUser.save();
      
      console.log(`Successfully updated user: ${userData.email}`);
      console.log(`User details: ${userData.firstName} ${userData.lastName} (${userData.role})`);
      console.log(`Email: ${userData.email}`);
      console.log(`Password: ${userData.password}`);
    }
  } catch (error) {
    console.error('Error adding user:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
addUser(); 