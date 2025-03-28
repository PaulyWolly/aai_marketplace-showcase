const fs = require('fs');
const path = require('path');

/**
 * Convert an image file to base64
 * @param {string} imagePath - Path to the image file
 * @returns {string} Base64 string with data URL prefix
 */
function imageToBase64(imagePath) {
  try {
    // Read the image file
    const image = fs.readFileSync(imagePath);
    // Convert to base64
    const base64 = image.toString('base64');
    // Get the mime type based on file extension
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    }[ext] || 'image/jpeg';
    
    // Return with data URL prefix
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error converting ${imagePath}:`, error.message);
    return null;
  }
}

// Get command line arguments
const args = process.argv.slice(2);

// If no arguments provided, show usage
if (args.length === 0) {
  console.log(`
Usage: node convert_to_base64.js <image_path> [image_path2 ...]

Examples:
  node convert_to_base64.js mary-baby-front.jpg
  node convert_to_base64.js *.jpg
  node convert_to_base64.js image1.jpg image2.png image3.jpg

The script will:
1. Convert each image to base64
2. Create a new file with the same name + '.base64.txt' containing the base64 string
3. The base64 string will include the proper data URL prefix (e.g., data:image/jpeg;base64,...)

Output files can be used directly in:
- HTML <img> tags
- CSS background-image properties
- JavaScript image loading
- API testing
`);
  process.exit(1);
}

// Process each image
args.forEach(imagePath => {
  console.log(`\nProcessing: ${imagePath}`);
  
  // Convert to base64
  const base64 = imageToBase64(imagePath);
  if (!base64) {
    return;
  }
  
  // Create output filename
  const outputPath = imagePath + '.base64.txt';
  
  // Save to file
  try {
    fs.writeFileSync(outputPath, base64);
    console.log(`✓ Saved base64 to: ${outputPath}`);
    console.log(`✓ File size: ${(base64.length / 1024).toFixed(2)} KB`);
    console.log(`✓ Can be used directly in HTML: <img src="${base64.substring(0, 64)}...">`);
  } catch (error) {
    console.error(`Error saving ${outputPath}:`, error.message);
  }
}); 