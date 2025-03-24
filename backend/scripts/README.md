# Admin User Management Scripts

This directory contains scripts to manage admin users in the MongoDB database.

## Prerequisites

Make sure you have Node.js installed and the required dependencies:

```bash
cd backend
npm install
```

## Available Scripts

### 1. Reset Admin Password

This script resets the password for all admin users in the database.

```bash
node scripts/reset-admin-password.js [new_password]
```

- If no password is provided, it will use `admin123` as the default.
- This script will find all users with the role 'admin' and update their passwords.

### 2. Update Specific User Password

This script updates the password for a specific user by email.

```bash
node scripts/update-admin-password.js <email> <new_password>
```

Example:
```bash
node scripts/update-admin-password.js admin@example.com admin123
```

- This script will prompt for confirmation if the user is not an admin.

### 3. Create Admin User

This script creates a new admin user or updates an existing user to have admin privileges.

```bash
node scripts/create-admin-user.js <email> <password> <firstName> <lastName>
```

Example:
```bash
node scripts/create-admin-user.js admin@example.com admin123 Admin User
```

- If a user with the provided email already exists, the script will:
  - Update their role to 'admin' if they're not already an admin
  - Ask if you want to reset their password

## Troubleshooting

If you encounter any issues:

1. Make sure your MongoDB connection string in the `.env` file is correct
2. Check that you have the required permissions to access the database
3. Ensure that the MongoDB service is running
4. Verify that the user collection exists in your database

## Security Notes

- These scripts are intended for development and administrative purposes only
- Store these scripts in a secure location
- Do not commit passwords to version control
- Consider using environment variables for sensitive information

## New Directory-Safe Script Runner

For your convenience, we've added a script runner that automatically detects if you're running a script from the wrong directory.

```bash
# From the project root directory:
node backend/scripts/run-admin-script.js reset-admin-password.js mypassword123

# Or from the backend directory:
node scripts/run-admin-script.js reset-admin-password.js mypassword123
```

The script runner will:
1. Detect if you're running from the root project or backend directory
2. Automatically change to the backend directory if needed
3. Show available scripts if you enter an invalid script name
4. Pass all arguments to the target script

### Examples

Reset admin password:
```bash
node backend/scripts/run-admin-script.js reset-admin-password.js admin123
```

Create admin user:
```bash
node backend/scripts/run-admin-script.js create-admin-user.js admin@example.com admin123 Admin User
```

List available scripts:
```bash
node backend/scripts/run-admin-script.js
``` 