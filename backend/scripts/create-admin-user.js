/**
 * Script to create a new admin user in MongoDB
 * 
 * Usage: 
 * node create-admin-user.js <email> <password> <firstName> <lastName>
 * 
 * Example:
 * node create-admin-user.js admin@example.com admin123 Admin User
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Check if required arguments are provided
const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('Usage: node create-admin-user.js <email> <password> <firstName> <lastName>');
  process.exit(1);
}

const [email, password, firstName, lastName] = args;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  console.log('Current directory:', __dirname);
  console.log('Available environment variables:', Object.keys(process.env).filter(key => !key.includes('SECRET')));
  process.exit(1);
}

async function createAdminUser() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Using connection string:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Load the User model directly from your existing models
    // This avoids schema conflicts
    let User;
    try {
      User = mongoose.model('User');
    } catch (e) {
      // If model doesn't exist, define it
      const userSchema = new mongoose.Schema({
        firstName: String,
        lastName: String,
        email: String,
        password: String,
        role: String,
        createdAt: {
          type: Date,
          default: Date.now
        },
        updatedAt: {
          type: Date,
          default: Date.now
        }
      });
      User = mongoose.model('User', userSchema);
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists.`);
      console.log(`Role: ${existingUser.role}`);
      
      if (existingUser.role !== 'admin') {
        console.log('Updating user role to admin...');
        existingUser.role = 'admin';
        await existingUser.save();
        console.log('User role updated to admin successfully');
      }
      
      console.log('Do you want to reset the password? (y/n)');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('', async (answer) => {
        readline.close();
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          // Hash the new password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          // Update the password
          existingUser.password = hashedPassword;
          existingUser.updatedAt = new Date();
          await existingUser.save();
          
          console.log('Password updated successfully');
        } else {
          console.log('Password not changed');
        }
        
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
          console.log('MongoDB connection closed');
        }
        process.exit(0);
      });
      
      return; // Don't proceed further
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save user to database
    await newUser.save();

    console.log(`Admin user created successfully:`);
    console.log(`- Name: ${firstName} ${lastName}`);
    console.log(`- Email: ${email}`);
    console.log(`- Role: admin`);
    console.log('\nYou can now log in with these credentials');

    // Close the MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);

  } catch (error) {
    console.error('Error creating admin user:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser(); 