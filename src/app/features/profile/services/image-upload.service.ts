import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  // Placeholder transparent image data URL for fallbacks
  private placeholderImage = 'data:image/png;base64,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';

  constructor(private snackBar: MatSnackBar) {}

  /**
   * Reduces image size to ensure it can be saved while maintaining reasonable quality
   * This creates a medium-sized image with better quality
   */
  createThumbnail(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      try {
        // Use placeholder as fallback
        const fallbackImage = this.placeholderImage;
        
        // Create an image element to load the original image
        const img = new Image();
        
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.warn('Image loading timed out, returning fallback image');
          resolve(fallbackImage);
        }, 3000);
        
        img.onload = () => {
          clearTimeout(timeout);
          
          try {
            // Create a medium-sized image (max 400px)
            const maxSize = 400;
            const canvas = document.createElement('canvas');
            
            // Calculate thumbnail dimensions
            let width = img.width;
            let height = img.height;
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
            
            // Set canvas size
            canvas.width = width;
            canvas.height = height;
            
            // Draw the image at the reduced size
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.error('Could not get canvas context');
              resolve(fallbackImage);
              return;
            }
            
            // Draw with white background to handle transparency
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            // Draw the image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG with improved quality (0.7)
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
            console.log(`Created image: ${width}x${height}, size: ${thumbnailUrl.length} bytes`);
            
            resolve(thumbnailUrl);
          } catch (err) {
            console.error('Error creating thumbnail:', err);
            resolve(fallbackImage);
          }
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          console.error('Error loading image');
          resolve(fallbackImage);
        };
        
        img.src = dataUrl;
      } catch (err) {
        console.error('Critical error creating thumbnail:', err);
        resolve('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
      }
    });
  }

  /**
   * Process file input for image upload
   * @param file The file to process
   * @returns Promise resolving to the processed image data URL
   */
  processImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select an image file'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const imageUrl = reader.result as string;
          console.log(`Image loaded, original size: ${imageUrl.length} bytes`);
          
          // Create a small thumbnail version to ensure save will work
          const thumbnailUrl = await this.createThumbnail(imageUrl);
          resolve(thumbnailUrl);
        } catch (err) {
          console.error('Error processing uploaded image:', err);
          reject(err);
        }
      };
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        reject(new Error('Error reading image file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Rotates an image data URL by the specified degrees
   * @param imageData The image data URL to rotate
   * @param degrees The number of degrees to rotate (90, 180, 270)
   * @returns Promise resolving to the rotated image data URL
   */
  rotateImage(imageData: string, degrees: number): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!imageData) {
          reject(new Error('No image data to rotate'));
          return;
        }
        
        // Create an image element to load the image
        const img = new Image();
        const isUrl = !imageData.startsWith('data:');
        
        // Handle potential CORS issues
        if (isUrl) {
          img.crossOrigin = 'Anonymous';
        }
        
        img.onload = () => {
          try {
            // Create a canvas to draw the rotated image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            
            // Set canvas dimensions based on rotation
            if (degrees === 90 || degrees === 270) {
              // Swap dimensions for 90 or 270 degree rotations
              canvas.width = img.height;
              canvas.height = img.width;
            } else {
              canvas.width = img.width;
              canvas.height = img.height;
            }
            
            // Clear canvas with white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Move to center of canvas
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            // Rotate the canvas context
            const radians = (degrees * Math.PI) / 180;
            ctx.rotate(radians);
            
            // Draw the image centered and rotated
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            // Convert back to data URL
            const rotatedImageData = canvas.toDataURL('image/jpeg', 0.7);
            resolve(rotatedImageData);
          } catch (err) {
            console.error('Error rotating image:', err);
            reject(err);
          }
        };
        
        img.onerror = (err) => {
          console.error('Error loading image for rotation:', err);
          reject(new Error('Failed to load image for rotation'));
        };
        
        img.src = imageData;
      } catch (err) {
        console.error('Error in rotation process:', err);
        reject(err);
      }
    });
  }

  /**
   * Convert base64 data URL to Blob
   */
  dataURLtoBlob(dataUrl: string): Blob {
    try {
      console.log('Converting data URL to blob...');
      
      // Check if the dataUrl is valid
      if (!dataUrl || !dataUrl.includes(';base64,')) {
        console.warn('Invalid data URL format, using fallback empty blob');
        return new Blob([], { type: 'image/jpeg' });
      }
      
      // Split the data URL to get the base64 data
      const parts = dataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'image/jpeg';
      
      // Add logging for image type
      console.log(`Image content type: ${contentType}`);
      
      // Ensure we have valid base64 content
      let base64Data = parts[1];
      
      // Clean up any potential whitespace or newlines
      base64Data = base64Data.replace(/\s/g, '');
      
      // Verify base64 pattern
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
        console.warn('Base64 data contains invalid characters');
        return new Blob([], { type: contentType });
      }
      
      // Add padding if needed
      while (base64Data.length % 4 !== 0) {
        base64Data += '=';
      }
      
      const raw = window.atob(base64Data);
      const rawLength = raw.length;
      
      // Create array buffer
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      
      // Create and return the blob
      const blob = new Blob([uInt8Array], { type: contentType });
      console.log(`Created blob of type ${contentType}, size: ${blob.size} bytes`);
      
      // Validate blob size
      if (blob.size < 100) {
        console.warn('Created blob is suspiciously small, might be corrupted');
        return new Blob([], { type: contentType });
      }
      
      return blob;
    } catch (err) {
      console.error('Critical error in dataURLtoBlob:', err);
      return new Blob([], { type: 'image/jpeg' });
    }
  }

  /**
   * Handles CORS security issues by downloading the image first and then processing it
   */
  handleCanvasSecurity(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!imageUrl.startsWith('data:')) {
        // For remote URLs, download it first
        fetch(imageUrl)
          .then(response => response.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onload = async (e) => {
              if (e.target?.result) {
                const dataUrl = e.target.result as string;
                try {
                  // Create a CORS-safe thumbnail
                  const safeImageData = await this.createThumbnail(dataUrl);
                  resolve(safeImageData);
                } catch (err) {
                  reject(err);
                }
              } else {
                reject(new Error('Failed to read image data'));
              }
            };
            reader.readAsDataURL(blob);
          })
          .catch(err => {
            console.error('Error downloading image:', err);
            reject(err);
          });
      } else {
        // If already a data URL but still having issues
        reject(new Error('Image has format restrictions'));
      }
    });
  }
} 