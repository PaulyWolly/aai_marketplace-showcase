/**
 * Test Login API Script
 * 
 * This script tests the login API directly using the fetch API
 * to simulate what the frontend would do.
 * 
 * Usage: node test-login-api.js <email> <password>
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fetch = require('node-fetch');

// Get credentials from command line
const args = process.argv.slice(2);
const email = args[0] || 'pwelby@gmail.com'; // Default to admin email
const password = args[1] || 'PJW_1236'; // Default to the password we set

// API URL
const API_URL = 'http://localhost:3000/api';

async function testLoginApi() {
  try {
    console.log(`Testing login API at ${API_URL}/auth/login`);
    console.log(`Using credentials: ${email} / ${password}`);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    console.log('\n--- API RESPONSE ---');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('\nLogin successful!');
      console.log('User data:', {
        id: data._id || data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        tokenReceived: !!data.token,
        tokenLength: data.token ? data.token.length : 0
      });
      
      console.log('\nToken (first 20 chars):', data.token ? data.token.substring(0, 20) + '...' : 'No token');
    } else {
      console.log('\nLogin failed!');
      console.log('Error:', data);
    }
    
  } catch (error) {
    console.error('\nError testing login API:', error.message);
    console.log('\nThis could indicate that:');
    console.log('1. The backend server is not running');
    console.log('2. The API URL is incorrect');
    console.log('3. There is a network issue');
    
    console.log('\nMake sure your backend server is running with:');
    console.log('cd backend && npm run dev');
  }
}

// Run the script
testLoginApi(); 