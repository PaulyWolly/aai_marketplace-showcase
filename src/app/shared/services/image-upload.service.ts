import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  constructor() { }

  /**
   * Process an image file and return a data URL
   * @param file The image file to process
   * @returns Promise with the processed image data URL
   */
  async processImage(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const img = new Image();
          
          img.onload = () => {
            try {
              // Resize if needed
              const maxDimension = 1200; // Max width or height
              let width = img.width;
              let height = img.height;
              
              // Calculate new dimensions while maintaining aspect ratio
              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = Math.round((height / width) * maxDimension);
                  width = maxDimension;
                } else {
                  width = Math.round((width / height) * maxDimension);
                  height = maxDimension;
                }
              }
              
              // Create canvas for the resized image
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              
              // Draw the image on canvas
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
              }
              
              ctx.drawImage(img, 0, 0, width, height);
              
              // Get data URL
              const dataUrl = canvas.toDataURL(file.type, 0.9); // 0.9 quality for JPEG
              resolve(dataUrl);
            } catch (err) {
              reject(err);
            }
          };
          
          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };
          
          // Set image source from FileReader result
          if (e.target?.result) {
            img.src = e.target.result as string;
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error reading file'));
        };
        
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Rotate an image 90 degrees clockwise
   * @param imageDataUrl The data URL of the image to rotate
   * @returns Promise with the rotated image data URL
   */
  async rotateImage(imageDataUrl: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const img = new Image();
        
        img.onload = () => {
          try {
            // Create canvas with swapped dimensions for rotation
            const canvas = document.createElement('canvas');
            canvas.width = img.height;
            canvas.height = img.width;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            
            // Move to the center of the canvas
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            // Rotate 90 degrees clockwise
            ctx.rotate(Math.PI / 2);
            
            // Draw the image, offset back to the top-left corner
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            // Get data URL with the same mime type as original
            const mimeType = this.extractMimeType(imageDataUrl);
            const rotatedDataUrl = canvas.toDataURL(mimeType, 0.9);
            
            resolve(rotatedDataUrl);
          } catch (err) {
            reject(err);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image for rotation'));
        };
        
        img.src = imageDataUrl;
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Extract MIME type from a data URL
   * @param dataUrl The data URL
   * @returns The MIME type string
   */
  private extractMimeType(dataUrl: string): string {
    try {
      const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
      if (matches && matches.length > 1) {
        return matches[1];
      }
      
      // Default to image/png if MIME type can't be extracted
      return 'image/png';
    } catch (err) {
      return 'image/png';
    }
  }

  /**
   * Check if an image URL is a base64 data URL
   * @param url The URL to check
   * @returns boolean indicating if it's a data URL
   */
  isDataUrl(url: string): boolean {
    return url.startsWith('data:image/');
  }

  /**
   * Convert a file object to a base64 data URL
   * @param file The file to convert
   * @returns Promise with the data URL result
   */
  fileToDataUrl(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
} 