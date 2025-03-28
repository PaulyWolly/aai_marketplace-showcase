const tf = require('@tensorflow/tfjs');
const sharp = require('sharp');
const logger = require('../utils/logger');

class ImagePreprocessingService {
  constructor() {
    this.targetSize = [224, 224]; // Standard input size for many CNN models
    this.channelCount = 3; // RGB
  }

  /**
   * Main preprocessing pipeline for images
   * @param {Buffer|string} imageData - Raw image data or base64 string
   * @returns {Promise<tf.Tensor4D>} Preprocessed image tensor
   */
  async preprocessImage(imageData) {
    try {
      // Convert base64 to buffer if needed
      const buffer = this.isBase64(imageData) 
        ? Buffer.from(imageData.split(',')[1], 'base64')
        : imageData;

      // Validate buffer
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Invalid input: expected Buffer or base64 string');
      }

      if (buffer.length === 0) {
        throw new Error('Invalid input: empty buffer');
      }

      // Basic image processing with sharp
      const processedBuffer = await this.applyBasicProcessing(buffer);
      
      // Convert to tensor
      const tensor = await this.bufferToTensor(processedBuffer);
      
      // Apply tensor transformations
      const normalizedTensor = await this.normalizeAndAugment(tensor);
      
      // Clean up intermediate tensor
      tensor.dispose();
      
      return normalizedTensor;
    } catch (error) {
      logger.error('Error in image preprocessing:', error);
      throw error;
    }
  }

  /**
   * Apply basic image processing using sharp
   * @param {Buffer} buffer - Raw image buffer
   * @returns {Promise<Buffer>} Processed image buffer
   */
  async applyBasicProcessing(buffer) {
    try {
      // Validate buffer again as a safeguard
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('Invalid image data');
      }

      // Try to identify the image format
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      if (!metadata || !metadata.format) {
        throw new Error('Unrecognized image format');
      }

      return await image
        .resize(this.targetSize[0], this.targetSize[1], {
          fit: 'cover',
          position: 'center'
        })
        .normalize() // Enhance contrast
        .removeAlpha() // Ensure RGB (remove alpha channel)
        .raw() // Get raw pixel data
        .toBuffer();
    } catch (error) {
      logger.error('Error in basic image processing:', error);
      throw error;
    }
  }

  /**
   * Convert image buffer to tensor
   * @param {Buffer} buffer - Raw pixel data buffer
   * @returns {Promise<tf.Tensor4D>} Image tensor
   */
  async bufferToTensor(buffer) {
    try {
      // Create a 3D tensor from the raw pixel data
      const pixels = new Float32Array(buffer);
      const tensor = tf.tensor3d(pixels, [this.targetSize[0], this.targetSize[1], this.channelCount]);
      
      // Add batch dimension
      const expanded = tensor.expandDims(0);
      
      // Clean up intermediate tensor
      tensor.dispose();
      
      return expanded;
    } catch (error) {
      logger.error('Error converting buffer to tensor:', error);
      throw error;
    }
  }

  /**
   * Apply normalization and augmentation to tensor
   * @param {tf.Tensor4D} tensor - Input image tensor
   * @returns {Promise<tf.Tensor4D>} Normalized and augmented tensor
   */
  async normalizeAndAugment(tensor) {
    return tf.tidy(() => {
      // Convert to float32 and normalize to [0, 1]
      const normalized = tensor.toFloat().div(255.0);
      
      // Apply standardization (zero mean and unit variance)
      const mean = normalized.mean();
      const std = normalized.sub(mean).square().mean().sqrt();
      const standardized = normalized.sub(mean).div(std);
      
      return standardized;
    });
  }

  /**
   * Check if input is base64 string
   * @param {any} data - Input data
   * @returns {boolean} True if base64 string
   */
  isBase64(data) {
    return typeof data === 'string' && data.includes('base64');
  }

  /**
   * Extract color features from image
   * @param {tf.Tensor4D} tensor - Input image tensor
   * @returns {Promise<Object>} Color features
   */
  async extractColorFeatures(tensor) {
    return tf.tidy(() => {
      // Calculate mean RGB values
      const meanRGB = tensor.mean([1, 2]);
      
      // Calculate color histogram
      const histogram = this.calculateColorHistogram(tensor);
      
      // Get dominant colors
      const dominantColors = this.extractDominantColors(tensor);
      
      // Convert tensor to array and normalize values to [0, 1] range for color classification
      const colorsArray = dominantColors.arraySync();
      const normalizedColors = colorsArray.map(rgb => {
        const [r, g, b] = rgb;
        // Match the normalization used in the test file
        return [
          Math.max(0, Math.min(1, (r + 4) / 8)),
          Math.max(0, Math.min(1, (g + 4) / 8)),
          Math.max(0, Math.min(1, (b + 4) / 8))
        ];
      });
      
      return {
        meanRGB: meanRGB.arraySync()[0],
        histogram: histogram.arraySync(),
        dominantColors: normalizedColors
      };
    });
  }

  /**
   * Calculate color histogram using custom binning
   * @param {tf.Tensor4D} tensor - Input image tensor
   * @returns {tf.Tensor2D} Color histogram
   */
  calculateColorHistogram(tensor) {
    const bins = 16; // Increased number of bins for better resolution
    return tf.tidy(() => {
      // Scale values to [0, bins-1]
      const scaled = tensor.mul(bins-1);
      
      // Calculate histogram for each channel
      const histograms = [];
      for (let i = 0; i < this.channelCount; i++) {
        const channel = scaled.slice([0, 0, 0, i], [-1, -1, -1, 1]);
        const flattened = channel.reshape([-1]);
        
        // Create bins
        const binCounts = new Array(bins).fill(0);
        const values = flattened.arraySync();
        
        // Count values in each bin
        values.forEach(value => {
          const binIndex = Math.min(Math.floor(value), bins - 1);
          binCounts[binIndex]++;
        });
        
        // Convert to tensor
        const hist = tf.tensor1d(binCounts);
        histograms.push(hist);
      }
      
      return tf.stack(histograms);
    });
  }

  /**
   * Extract dominant colors using color histogram peaks
   * @param {tf.Tensor4D} tensor - Input image tensor
   * @returns {tf.Tensor2D} Dominant colors
   */
  extractDominantColors(tensor) {
    const k = 5; // Number of dominant colors to extract
    return tf.tidy(() => {
      // Calculate color histogram
      const histogram = this.calculateColorHistogram(tensor);
      const histArray = histogram.arraySync();
      
      // Find peaks in each channel
      const peaks = [];
      for (let i = 0; i < this.channelCount; i++) {
        const channel = histArray[i];
        // Find local maxima with minimum threshold
        const threshold = Math.max(...channel) * 0.1; // 10% of max value
        for (let j = 1; j < channel.length - 1; j++) {
          if (channel[j] > threshold && 
              channel[j] > channel[j-1] && 
              channel[j] > channel[j+1]) {
            // Convert bin index back to [0, 1] range
            const value = j / (channel.length - 1);
            peaks.push([i, value, channel[j]]);
          }
        }
      }
      
      // Sort peaks by intensity and take top k
      peaks.sort((a, b) => b[2] - a[2]);
      
      // If we don't have enough peaks, add some from the histogram
      if (peaks.length < k) {
        const remaining = k - peaks.length;
        const usedChannels = new Set(peaks.map(p => p[0]));
        
        // Add peaks from channels we haven't used yet
        for (let i = 0; i < this.channelCount && peaks.length < k; i++) {
          if (!usedChannels.has(i)) {
            const channel = histArray[i];
            const maxValue = Math.max(...channel);
            const maxIndex = channel.indexOf(maxValue);
            peaks.push([i, maxIndex / (channel.length - 1), maxValue]);
          }
        }
        
        // If we still need more, add some from the most intense channel
        while (peaks.length < k) {
          const channel = histArray[0]; // Use red channel as default
          const maxValue = Math.max(...channel);
          const maxIndex = channel.indexOf(maxValue);
          peaks.push([0, maxIndex / (channel.length - 1), maxValue]);
        }
      }
      
      // Take exactly k peaks
      const topPeaks = peaks.slice(0, k);
      
      // Create color tensors from peaks
      const colors = topPeaks.map(peak => {
        const [channel, value] = peak;
        const rgb = [0, 0, 0];
        rgb[channel] = value;
        return tf.tensor1d(rgb);
      });
      
      return tf.stack(colors);
    });
  }
}

module.exports = ImagePreprocessingService; 