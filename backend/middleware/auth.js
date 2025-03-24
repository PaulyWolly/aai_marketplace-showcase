const jwt = require('jsonwebtoken');
const config = require('../config');

// Middleware to authenticate JWT token
const auth = (req, res, next) => {
  console.log('Auth middleware - Headers:', req.headers);
  
  // Get token from Authorization header
  const authHeader = req.header('Authorization');
  console.log('Auth middleware - Authorization header:', authHeader);

  // Check if no auth header
  if (!authHeader) {
    console.log('Auth middleware - No authorization header found');
    return res.status(401).json({ message: 'No authorization header, access denied' });
  }

  // Check if it's a Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    console.log('Auth middleware - Invalid token format:', authHeader);
    return res.status(401).json({ message: 'Invalid token format, must be Bearer token' });
  }

  // Extract the token
  const token = authHeader.split(' ')[1];
  console.log('Auth middleware - Extracted token:', token.substring(0, 20) + '...');

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    console.log('Auth middleware - Token verified, user:', decoded);
    
    // Add user from payload
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware - Token verification failed:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to ensure user is an admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { auth, isAdmin }; 