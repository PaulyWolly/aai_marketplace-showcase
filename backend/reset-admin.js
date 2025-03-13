const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('./config');
const User = require('./models/User');

// New admin password
const NEW_PASSWORD = 'admin123';

async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('No admin user found. Creating a new admin user...');
      
      // Create a new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
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
      console.log('New admin user created:');
      console.log('Email:', newAdmin.email);
      console.log('Password:', NEW_PASSWORD);
    } else {
      console.log('Admin user found:', adminUser.email);
      
      // Reset password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      adminUser.password = hashedPassword;
      adminUser.updatedAt = new Date();
      
      await adminUser.save();
      console.log('Admin password reset successfully');
      console.log('Email:', adminUser.email);
      console.log('New password:', NEW_PASSWORD);
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
resetAdminPassword(); 