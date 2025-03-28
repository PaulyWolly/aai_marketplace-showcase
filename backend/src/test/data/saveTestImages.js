const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Function to save and process image
async function saveProcessedImage(sourceImagePath, targetFilename) {
  try {
    // Process image with sharp
    await sharp(sourceImagePath)
      .jpeg({ quality: 90 })
      .toFile(path.join(__dirname, targetFilename));
    
    console.log(`Saved ${targetFilename}`);
  } catch (error) {
    console.error(`Error saving ${targetFilename}:`, error);
  }
}

// Save test images
async function saveTestImages() {
  const testImages = require('./test-images');
  
  // Define source image paths (you'll need to update these paths)
  const sourceImages = {
    front: path.join(__dirname, '../../../../uploads/mary-baby-front.jpg'),
    back: path.join(__dirname, '../../../../uploads/mary-baby-back.jpg'),
    signature: path.join(__dirname, '../../../../uploads/mary-baby-signature.jpg')
  };
  
  // Save front view
  await saveProcessedImage(sourceImages.front, testImages.maryBabyFront.name);
  
  // Save back view
  await saveProcessedImage(sourceImages.back, testImages.maryBabyBack.name);
  
  // Save signature view
  await saveProcessedImage(sourceImages.signature, testImages.maryBabySignature.name);
}

// Run if called directly
if (require.main === module) {
  saveTestImages().catch(console.error);
} 