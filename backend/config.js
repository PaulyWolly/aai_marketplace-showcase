require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: '24h',
  port: process.env.PORT || 5000
}; 