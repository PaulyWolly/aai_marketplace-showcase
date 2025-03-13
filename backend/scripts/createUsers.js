const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const createUsers = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Clear existing users (optional, comment out if you want to keep other users)
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create admin user
    const adminUser = await User.create({
      firstName: 'Paul',
      lastName: 'Welby',
      email: 'pwelby@gmail.com',
      password: 'AaBbCc$12345',
      role: 'admin'
    });
    console.log('Admin user created successfully:', adminUser);

    // Create test user
    const testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'user@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('Test user created successfully:', testUser);

    console.log('\nUser credentials:');
    console.log('Admin - Email: pwelby@gmail.com, Password: AaBbCc$12345');
    console.log('Test User - Email: user@example.com, Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
};

createUsers(); 