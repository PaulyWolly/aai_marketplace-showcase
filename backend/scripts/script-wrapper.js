#!/usr/bin/env node

/**
 * Script Wrapper for Admin Tools
 * 
 * This is a utility wrapper that ensures scripts are run from the correct directory.
 * It detects if the script is being run from the project root and automatically 
 * changes to the backend directory if needed.
 * 
 * Usage: 
 * node script-wrapper.js <script-name> [arguments...]
 * 
 * Example:
 * node script-wrapper.js reset-admin-password.js admin123
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Get the script name and arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('\x1b[31mError: No script specified\x1b[0m');
  console.log('\nUsage: node script-wrapper.js <script-name> [arguments...]');
  console.log('Example: node script-wrapper.js reset-admin-password.js mypassword123');
  process.exit(1);
}

const scriptName = args[0];
const scriptArgs = args.slice(1);

// Check if we're running from the correct directory
function checkDirectory() {
  // Check for the presence of the .env file to determine if we're in the backend directory
  const inBackend = fs.existsSync(path.join(process.cwd(), '.env')) && 
                   fs.existsSync(path.join(process.cwd(), 'scripts'));

  // Check if we're in the project root
  const inProjectRoot = !inBackend && 
                       fs.existsSync(path.join(process.cwd(), 'backend')) && 
                       fs.existsSync(path.join(process.cwd(), 'backend', '.env'));

  return { inBackend, inProjectRoot };
}

// Main function to run the script
function runScript() {
  const { inBackend, inProjectRoot } = checkDirectory();
  
  // Determine the script path
  let scriptPath;
  let workingDir = process.cwd();
  
  if (inBackend) {
    // We're already in the backend directory
    scriptPath = path.join('scripts', scriptName);
    console.log('\x1b[32m✓ Running from backend directory\x1b[0m');
  } else if (inProjectRoot) {
    // We're in the project root, change to backend
    scriptPath = path.join('backend', 'scripts', scriptName);
    workingDir = path.join(process.cwd(), 'backend');
    console.log('\x1b[33m⚠ Running from project root - automatically changing to backend directory\x1b[0m');
  } else {
    // We're in an unknown directory
    console.error('\x1b[31m✗ Error: Not running from a recognized project directory\x1b[0m');
    console.log('\nThis script must be run from either:');
    console.log(' - The backend directory');
    console.log(' - The project root directory (containing the backend folder)');
    console.log('\nCurrent directory:', process.cwd());
    process.exit(1);
  }
  
  // Check if the requested script exists
  const fullScriptPath = path.resolve(scriptPath);
  if (!fs.existsSync(fullScriptPath)) {
    console.error(`\x1b[31m✗ Error: Script not found: ${scriptName}\x1b[0m`);
    
    // Check what scripts are available
    let scriptsDir;
    if (inBackend) {
      scriptsDir = path.join(process.cwd(), 'scripts');
    } else if (inProjectRoot) {
      scriptsDir = path.join(process.cwd(), 'backend', 'scripts');
    }
    
    if (scriptsDir && fs.existsSync(scriptsDir)) {
      console.log('\nAvailable scripts:');
      fs.readdirSync(scriptsDir)
        .filter(file => file.endsWith('.js') && file !== 'script-wrapper.js')
        .forEach(file => {
          console.log(` - ${file}`);
        });
    }
    
    process.exit(1);
  }
  
  // Execute the script
  console.log(`\nExecuting: node ${scriptPath} ${scriptArgs.join(' ')}\n`);
  
  const nodeProcess = spawn('node', [scriptPath, ...scriptArgs], {
    stdio: 'inherit',
    cwd: workingDir
  });
  
  nodeProcess.on('close', (code) => {
    process.exit(code);
  });
}

// Run the script
runScript(); 