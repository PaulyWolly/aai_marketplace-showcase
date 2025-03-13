const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Remove any existing admin users
    await User.deleteMany({ role: 'admin' });
    console.log('Removed existing admin users');

    // Create new admin user
    const adminUser = await User.create({
      firstName: 'Paul',
      lastName: 'Welby',
      email: 'pwelby@gmail.com',
      password: 'AaBbCc$12345',
      role: 'admin'
    });

    console.log('Admin user created successfully:', adminUser);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser(); 