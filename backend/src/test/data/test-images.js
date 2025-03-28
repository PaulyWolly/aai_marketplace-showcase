const fs = require('fs');
const path = require('path');

// Load base64 data from generated files
const loadBase64Image = (filename) => {
  try {
    return fs.readFileSync(path.join(__dirname, `${filename}.base64.txt`), 'utf8');
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    return null;
  }
};

// Test images for the image preprocessing pipeline
const testImages = {
  // Front view of Mary & Baby statuette
  maryBabyFront: {
    name: 'mary-baby-front.jpg',
    description: 'Front view of a vintage Mary & Baby statuette showing cream-colored figures with Mary wearing a red robe',
    dominantColors: ['cream', 'red', 'green'],
    expectedFeatures: {
      category: 'Religious Statue',
      condition: 'Good with some wear',
      materials: ['Ceramic', 'Paint'],
      style: 'Traditional Religious'
    },
    data: loadBase64Image('mary-baby-front.jpg')
  },
  
  // Back view showing condition and wear
  maryBabyBack: {
    name: 'mary-baby-back.jpg',
    description: 'Back view showing the red robe with some paint wear and damage',
    dominantColors: ['red', 'cream'],
    expectedFeatures: {
      condition: 'Fair - visible paint wear and chips',
      materials: ['Ceramic', 'Paint'],
      damage: ['Paint chips', 'Wear']
    },
    data: loadBase64Image('mary-baby-back.jpg')
  },
  
  // Artist signature and markings
  maryBabySignature: {
    name: 'mary-baby-signature.jpg',
    description: 'Base of the statue showing "ARS SACRA" marking and artist signature "J.H."',
    dominantColors: ['cream', 'red'],
    expectedFeatures: {
      maker: 'ARS SACRA',
      artist: 'J.H.',
      markings: ['ARS SACRA', 'Artist signature']
    },
    data: loadBase64Image('mary-baby-signature.jpg')
  }
};

// Verify all images loaded successfully
Object.entries(testImages).forEach(([key, image]) => {
  if (!image.data) {
    console.error(`Failed to load image data for ${key}`);
  }
});

module.exports = testImages; 