# Backend API

This directory contains the backend API for the Appraisal AI application.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

3. Start the server:
   ```
   npm start
   ```

## Sample Data

### Adding Sample Items

To populate the database with sample items, you can use the `create-sample-items.js` script:

```
node create-sample-items.js
```

This script will:
1. Connect to your MongoDB database
2. Find an admin user in the database
3. Create 5 sample items with that admin user as the owner
4. Add these items to the database

If items already exist in the database, the script will show a message and exit. To force adding sample items even if some already exist, use:

```
node create-sample-items.js --force
```

### Requirements

- You must have at least one user with the role 'admin' in the database
- The MongoDB connection must be properly configured in your .env file

## API Endpoints

The API includes endpoints for:
- Authentication (login, register)
- User management
- Appraisal items (create, read, update, delete)
- Admin functions

See the API documentation for more details on available endpoints. 