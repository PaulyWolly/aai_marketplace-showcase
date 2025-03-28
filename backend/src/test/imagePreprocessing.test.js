const tf = require('@tensorflow/tfjs');
const testImages = require('./data/test-images');
const ImagePreprocessingService = require('../services/imagePreprocessing.service');

describe('ImagePreprocessingService', () => {
  let imagePreprocessing;
  let frontImageData;
  let backImageData;
  let signatureImageData;

  beforeAll(async () => {
    imagePreprocessing = new ImagePreprocessingService();
    
    // Load test images from base64 data
    frontImageData = testImages.maryBabyFront.data;
    backImageData = testImages.maryBabyBack.data;
    signatureImageData = testImages.maryBabySignature.data;
  });

  afterEach(() => {
    // Clean up any remaining tensors
    tf.disposeVariables();
  });

  test('preprocessImage should return a valid tensor', async () => {
    const tensor = await imagePreprocessing.preprocessImage(frontImageData);
    
    expect(tensor).toBeDefined();
    expect(tensor instanceof tf.Tensor).toBe(true);
    expect(tensor.shape).toEqual([1, 224, 224, 3]);
    
    // Check if values are normalized
    const values = await tensor.data();
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    
    expect(mean).toBeCloseTo(0, 1);
    expect(std).toBeCloseTo(1, 1);
    
    tensor.dispose();
  });

  test('extractColorFeatures should match expected dominant colors', async () => {
    const tensor = await imagePreprocessing.preprocessImage(frontImageData);
    const features = await imagePreprocessing.extractColorFeatures(tensor);
    
    expect(features).toBeDefined();
    expect(features.meanRGB).toHaveLength(3);
    expect(features.histogram).toBeDefined();
    expect(features.dominantColors).toBeDefined();
    
    // Check if dominant colors match expected colors
    const dominantColors = features.dominantColors;
    const expectedColors = testImages.maryBabyFront.dominantColors;
    
    // Convert RGB values to color names and check if they match expected colors
    const detectedColors = dominantColors.map(rgb => {
      // Log the RGB values for debugging
      console.log('RGB values:', rgb);
      
      // Color classification based on RGB values
      const [r, g, b] = rgb;
      const color = classifyColor(r, g, b);
      return color;
    });
    
    expectedColors.forEach(color => {
      expect(detectedColors).toContain(color);
    });
    
    tensor.dispose();
  });

  test('calculateColorHistogram should return valid histogram', async () => {
    const tensor = await imagePreprocessing.preprocessImage(frontImageData);
    const histogram = imagePreprocessing.calculateColorHistogram(tensor);
    
    expect(histogram).toBeDefined();
    expect(histogram instanceof tf.Tensor).toBe(true);
    expect(histogram.shape[0]).toBe(3); // RGB channels
    expect(histogram.shape[1]).toBe(16); // Number of bins
    
    tensor.dispose();
    histogram.dispose();
  });

  test('extractDominantColors should return valid colors', async () => {
    const tensor = await imagePreprocessing.preprocessImage(frontImageData);
    const colors = imagePreprocessing.extractDominantColors(tensor);
    
    expect(colors).toBeDefined();
    expect(colors instanceof tf.Tensor).toBe(true);
    expect(colors.shape[0]).toBe(5); // Number of dominant colors
    expect(colors.shape[1]).toBe(3); // RGB values
    
    tensor.dispose();
    colors.dispose();
  });

  test('should handle base64 image input', async () => {
    const tensor = await imagePreprocessing.preprocessImage(frontImageData);
    
    expect(tensor).toBeDefined();
    expect(tensor instanceof tf.Tensor).toBe(true);
    expect(tensor.shape).toEqual([1, 224, 224, 3]);
    
    tensor.dispose();
  });

  it('should handle errors gracefully', async () => {
    const service = new ImagePreprocessingService();
    
    // Test with invalid input
    const invalidInput = null;
    console.log('Testing with invalid input:', typeof invalidInput);
    
    await expect(service.preprocessImage(invalidInput))
      .rejects
      .toThrow('Invalid input: expected Buffer or base64 string');
  });

  test('should detect wear and damage in back view', async () => {
    const tensor = await imagePreprocessing.preprocessImage(backImageData);
    const features = await imagePreprocessing.extractColorFeatures(tensor);
    
    // Check if color variations indicate wear/damage
    const histogram = features.histogram;
    const redChannel = histogram[0];
    
    // Calculate variance in red channel (high variance indicates wear)
    const mean = redChannel.reduce((a, b) => a + b, 0) / redChannel.length;
    const variance = redChannel.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / redChannel.length;
    
    expect(variance).toBeGreaterThan(0.1); // Threshold for detecting wear
    
    tensor.dispose();
  });

  test('should process signature view for text detection', async () => {
    const tensor = await imagePreprocessing.preprocessImage(signatureImageData);
    
    // Verify image is properly preprocessed for text detection
    expect(tensor.shape).toEqual([1, 224, 224, 3]);
    
    // Extract features focusing on the signature area
    const features = await imagePreprocessing.extractColorFeatures(tensor);
    
    // Check contrast in signature area
    const histogram = features.histogram;
    const brightnessVariation = Math.max(...histogram[0]) - Math.min(...histogram[0]);
    
    expect(brightnessVariation).toBeGreaterThan(0.2); // Threshold for text visibility
    
    tensor.dispose();
  });
});

// Color classification based on RGB values
function classifyColor(r, g, b) {
  // Red: significantly higher red than other channels
  if (r > 0.6 && g < 0.55 && b < 0.55) {
    return 'red';
  }
  // Green: significantly higher green than other channels
  if (g > 0.55 && r < 0.5 && b < 0.5) {
    return 'green';
  }
  // Blue: significantly higher blue than other channels
  if (b > 0.55 && r < 0.5 && g < 0.5) {
    return 'blue';
  }
  // Cream: high values in all channels
  if (r > 0.5 && g > 0.5 && b > 0.5) {
    return 'cream';
  }
  return 'other';
} 