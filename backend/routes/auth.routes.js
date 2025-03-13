const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    
    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('User found:', user.email);
    
    // Check if comparePassword method exists
    if (typeof user.comparePassword !== 'function') {
      console.error('comparePassword method not found on user object');
      // Fallback to direct bcrypt comparison
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Password does not match');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      // Use the model's comparePassword method
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.log('Password does not match');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }
    
    console.log('Password matched for user:', email);
    
    // Create and sign JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }, 
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );
    
    console.log('Token generated successfully');
    
    // Return user data and token
    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
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
    
    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role: 'user'
    });
    
    // Save user to database
    await user.save();
    
    // Create and sign JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }, 
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );
    
    // Return user data and token
    res.status(201).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 