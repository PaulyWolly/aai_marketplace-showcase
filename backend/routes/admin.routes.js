const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');

// Middleware to ensure only admins can access these routes
router.use(auth);
router.use(isAdmin);

// Reset a user's password
router.post('/reset-password', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate a random password
    const newPassword = Math.random().toString(36).slice(-8);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user's password
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();
    
    // Return the new password
    res.json({ 
      message: 'Password reset successful',
      userId: user._id,
      email: user.email,
      newPassword
    });
    
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new admin user
router.post('/create-admin', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Create new admin user
    const user = new User({
      firstName,
      lastName,
      email,
      password, // Will be hashed by the pre-save hook
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Save user to database
    await user.save();
    
    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Run admin script to reset all admin passwords
router.post('/reset-all-admin-passwords', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    
    if (adminUsers.length === 0) {
      return res.status(404).json({ message: 'No admin users found' });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update passwords for all admin users
    const updatePromises = adminUsers.map(async (user) => {
      user.password = hashedPassword;
      user.updatedAt = new Date();
      await user.save();
      return user;
    });
    
    await Promise.all(updatePromises);
    
    res.json({
      message: 'All admin passwords reset successfully',
      count: adminUsers.length,
      admins: adminUsers.map(user => ({
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      }))
    });
    
  } catch (error) {
    console.error('Error resetting admin passwords:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 