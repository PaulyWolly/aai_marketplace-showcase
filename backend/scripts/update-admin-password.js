/**
 * Script to update admin password in MongoDB
 * 
 * Usage: 
 * node update-admin-password.js <email> <new_password>
 * 
 * Example:
 * node update-admin-password.js admin@example.com admin123
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Check if email and password are provided
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node update-admin-password.js <email> <new_password>');
  process.exit(1);
}

const [email, newPassword] = args;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  console.log('Current directory:', __dirname);
  console.log('Available environment variables:', Object.keys(process.env).filter(key => !key.includes('SECRET')));
  process.exit(1);
}

async function updateAdminPassword() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Using connection string:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define User schema (simplified version of your actual schema)
    const userSchema = new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      password: String,
      role: String,
      createdAt: Date,
      updatedAt: Date
    });

    // Create User model
    const User = mongoose.model('User', userSchema);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log(`Warning: User ${email} is not an admin (role: ${user.role})`);
      const proceed = await promptYesNo('Do you want to proceed anyway? (y/n): ');
      if (!proceed) {
        console.log('Operation cancelled');
        process.exit(0);
      }
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();

    console.log(`Password updated successfully for user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log('You can now log in with the new password');

  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    // Close the MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Simple yes/no prompt function
function promptYesNo(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Run the script
updateAdminPassword(); 