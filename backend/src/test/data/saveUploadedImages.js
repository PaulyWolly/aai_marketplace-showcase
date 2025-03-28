const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create directories if they don't exist
const uploadsDir = path.join(__dirname, '../../../../uploads');
const testDataDir = path.join(__dirname);

[uploadsDir, testDataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Save the three views with proper names
const images = [
  {
    name: 'mary-baby-front.jpg',
    description: 'Front view of Mary & Baby statuette'
  },
  {
    name: 'mary-baby-back.jpg',
    description: 'Back view showing wear and damage'
  },
  {
    name: 'mary-baby-signature.jpg',
    description: 'Base view showing ARS SACRA signature'
  }
];

// Process and save each image
async function processAndSaveImage(imagePath, targetName) {
  try {
    // Save to uploads directory
    await sharp(imagePath)
      .jpeg({ quality: 90 })
      .toFile(path.join(uploadsDir, targetName));
    
    // Save to test data directory
    await sharp(imagePath)
      .jpeg({ quality: 90 })
      .toFile(path.join(testDataDir, targetName));
    
    console.log(`Saved ${targetName} to both directories`);
  } catch (error) {
    console.error(`Error processing ${targetName}:`, error);
  }
}

// Instructions for use
console.log(`
Please save your three images with these exact names in the backend/uploads directory:
${images.map(img => `- ${img.name}: ${img.description}`).join('\n')}

Then run:
node saveUploadedImages.js

This will process the images and save them in both the uploads and test/data directories.
`);

// Process images if they exist
async function processImages() {
  for (const image of images) {
    const sourcePath = path.join(uploadsDir, image.name);
    if (fs.existsSync(sourcePath)) {
      await processAndSaveImage(sourcePath, image.name);
    } else {
      console.error(`Missing image: ${image.name}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  processImages().catch(console.error);
} 