import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ImageUploadService } from './image-upload.service';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FormSubmissionService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private imageService: ImageUploadService
  ) {}

  /**
   * Standard API submission with proper error handling
   */
  async sendApiSubmission(data: Record<string, any>, endpoint: string, id?: string): Promise<any> {
    try {
      console.log('Attempting standard API submission...');
      
      // Get API URL based on edit mode
      let url = `${environment.apiUrl}/${endpoint}`;
      const method = id ? 'PUT' : 'POST';
      
      // For edit mode with ID, use URL with ID parameter
      if (id) {
        url = `${environment.apiUrl}/${endpoint}/${id}`;
      }
      
      // Log request details
      console.log(`API ${method} request to ${url}`);
      
      // Prepare headers with authentication
      const headers = new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      
      // Make API request
      let response: any;
      
      if (method === 'POST') {
        response = await this.http.post(url, data, { headers }).toPromise();
      } else {
        response = await this.http.put(url, data, { headers }).toPromise();
      }
      
      console.log('API submission successful:', response);
      this.showSuccessMessage(id ? 'Item updated successfully' : 'Item created successfully');
      return response;
    } catch (error: any) {
      // Extract meaningful error information
      console.error('API submission error:', error);
      
      let errorMessage = 'An error occurred while saving the item';
      
      // Extract error message from various error response formats
      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.error) {
          errorMessage = error.error.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.showErrorMessage(errorMessage);
      
      // Re-throw so the caller can try alternative submission methods
      throw new Error(errorMessage);
    }
  }

  /**
   * Alternative submission method using multipart/form-data
   */
  async submitWithMultipart(data: Record<string, any>, endpoint: string, id?: string): Promise<any> {
    try {
      console.log('Attempting multipart submission...');
      
      const multipartData = new FormData();
      
      // First add simple fields (not images or complex objects)
      Object.keys(data).forEach(key => {
        if (key !== 'images' && key !== 'imageUrl' && key !== 'appraisal' && key !== '_id' && 
            data[key] !== undefined && data[key] !== null) {
          multipartData.append(key, String(data[key]));
        }
      });
      
      // Handle ID field separately to ensure it's formatted correctly
      if (id) {
        multipartData.append('_id', id);
      }
      
      // Handle appraisal details - stringify the whole object
      if (data['appraisal'] && typeof data['appraisal'] === 'object') {
        // Ensure both required fields are defined as strings
        const appraisalData = {
          details: String(data['appraisal'].details || ''),
          marketResearch: String(data['appraisal'].marketResearch || '')
        };
        multipartData.append('appraisal', JSON.stringify(appraisalData));
      } else {
        // Always include empty appraisal object with required fields
        multipartData.append('appraisal', JSON.stringify({
          details: '',
          marketResearch: ''
        }));
      }
      
      // Process images array - only if we don't have a main image to send as blob
      if (!data['imageUrl'] && data['images'] && data['images'].length > 0) {
        // Use first image as main image
        data['imageUrl'] = data['images'][0];
      }
      
      // Always send images array as JSON string if it exists
      if (data['images'] && Array.isArray(data['images']) && data['images'].length > 0) {
        multipartData.append('images', JSON.stringify(data['images']));
      }
      
      // Handle main image - convert to blob if it's a data URL
      if (data['imageUrl']) {
        // Always add the imageUrl as a string field
        multipartData.append('imageUrl', data['imageUrl']);
        
        // If it's a data URL, also add as a binary blob
        if (data['imageUrl'].startsWith('data:')) {
          try {
            const imageBlob = this.imageService.dataURLtoBlob(data['imageUrl']);
            console.log(`Adding image blob (${imageBlob.size} bytes, type: ${imageBlob.type})`);
            multipartData.append('image', imageBlob, 'image.jpg');
          } catch (err) {
            console.error('Error converting image data URL to blob:', err);
          }
        }
      } else {
        // Always ensure there's at least an empty imageUrl
        multipartData.append('imageUrl', '');
      }
      
      // Log what we're submitting (without the large data)
      console.log('Multipart submission keys:');
      const keys: string[] = [];
      multipartData.forEach((_, key) => keys.push(key));
      console.log(keys.join(', '));
      
      // Send using the multipart method with extended timeout
      return await this.sendFormDataWithXhr(multipartData, endpoint, id);
    } catch (err: any) {
      console.error('Multipart submission failed:', err);
      this.showErrorMessage(`Submission failed: ${err.message || 'Unknown error'}`);
      throw err;
    }
  }

  /**
   * XHR-based FormData submission method with detailed control and progress reporting
   */
  private sendFormDataWithXhr(formData: FormData, endpoint: string, id?: string): Promise<any> {
    // Check for required fields
    const requiredFields = ['name', 'category', 'condition', 'estimatedValue'];
    const formDataKeys: string[] = [];
    formData.forEach((_, key) => formDataKeys.push(key));
    
    const missingFields = requiredFields.filter(field => !formDataKeys.includes(field));
    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(', ')}`);
      return Promise.reject(new Error(`Missing required fields: ${missingFields.join(', ')}`));
    }
    
    return new Promise<any>((resolve, reject) => {
      // Construct URL
      let url = `${environment.apiUrl}/${endpoint}`;
      
      // For edit mode, include the itemId in the URL path
      if (id) {
        url = `${environment.apiUrl}/${endpoint}/${id}`;
        console.log(`Edit mode URL with id: ${url}`);
      }
      
      console.log('Submitting to URL:', url);
      
      const xhr = new XMLHttpRequest();
      xhr.open(id ? 'PUT' : 'POST', url);
      
      // Set auth headers
      const token = this.authService.getToken();
      if (token) {
        console.log('Setting Authorization header with token');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      } else {
        console.error('No token available for authentication');
        reject(new Error('No authentication token available'));
        return;
      }
      
      // Critical: Don't set Content-Type for FormData - let browser handle it
      // Setting content-type manually is a common mistake that breaks multipart uploads
      
      // Add response type for easier parsing
      xhr.responseType = 'json';
      
      // Add detailed progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          console.log(`Upload progress: ${percentComplete}%`);
        }
      };
      
      // Add event listeners
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('XHR success response:', xhr.response);
          try {
            // With responseType='json', response is already parsed
            const response = xhr.response;
            if (response) {
              this.showSuccessMessage(id ? 'Item updated successfully' : 'Item created successfully');
              resolve(response);
            } else {
              console.warn('Empty response received (status OK)');
              this.showSuccessMessage(id ? 'Item updated successfully' : 'Item created successfully');
              resolve({success: true});
            }
          } catch (err) {
            console.error('Error handling response:', err);
            reject(err);
          }
        } else {
          console.error(`Server error: ${xhr.status} ${xhr.statusText}`, xhr.response);
          
          let errorDetail = `Server error: ${xhr.status}`;
          
          // Handle specific error codes with more details
          if (xhr.status === 413) {
            errorDetail = 'Image is too large to upload. Please use a smaller image.';
          } else if (xhr.status === 400) {
            try {
              // Response should already be parsed as JSON
              const errorResponse = xhr.response;
              if (errorResponse) {
                console.log('Error response:', errorResponse);
                
                // Check for various error message formats
                if (errorResponse.message) {
                  errorDetail = errorResponse.message;
                } else if (errorResponse.error && typeof errorResponse.error === 'string') {
                  errorDetail = errorResponse.error;
                } else if (errorResponse.errors) {
                  // For validation error objects
                  const errorMessages = [];
                  for (const field in errorResponse.errors) {
                    if (typeof errorResponse.errors[field] === 'string') {
                      errorMessages.push(`${field}: ${errorResponse.errors[field]}`);
                    } else if (errorResponse.errors[field].message) {
                      errorMessages.push(`${field}: ${errorResponse.errors[field].message}`);
                    }
                  }
                  if (errorMessages.length > 0) {
                    errorDetail = errorMessages.join(', ');
                  }
                }
              } else if (xhr.responseText) {
                // Fallback to text if JSON parsing failed
                errorDetail = xhr.responseText.substring(0, 200);
              }
            } catch (handlingErr) {
              console.error('Error handling 400 response:', handlingErr);
              errorDetail = `Bad Request: ${xhr.responseText || 'Unknown validation error'}`;
            }
          }
          
          this.showErrorMessage(errorDetail);
          reject(new Error(errorDetail));
        }
      };
      
      xhr.onerror = () => {
        console.error('XHR network error');
        const errorMessage = 'Network error occurred. Please check your internet connection.';
        this.showErrorMessage(errorMessage);
        reject(new Error(errorMessage));
      };
      
      xhr.ontimeout = () => {
        console.error('XHR request timed out');
        const errorMessage = 'Request timed out - the image might be too large. Please try a smaller image.';
        this.showErrorMessage(errorMessage);
        reject(new Error(errorMessage));
      };
      
      // Increase timeout for large requests
      xhr.timeout = 120000; // 120 seconds
      
      // Log that we're about to send
      console.log('Sending FormData with XHR...');
      try {
        xhr.send(formData);
      } catch (err) {
        console.error('Error sending XHR request:', err);
        const errorMessage = 'Failed to send request: ' + (err as Error).message;
        this.showErrorMessage(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }

  /**
   * Last resort submission with minimal data (dev environments only)
   */
  async submitMinimalData(data: Record<string, any>, endpoint: string, id?: string): Promise<any> {
    if (environment.production) {
      return Promise.reject(new Error('Minimal submission not available in production'));
    }
    
    try {
      console.log('Attempting minimal data submission...');
      
      // Create the simplest possible valid object
      const minimalData: Record<string, any> = {
        name: data['name'] || 'Unnamed Item',
        category: data['category'] || 'Other',
        condition: data['condition'] || 'Good',
        estimatedValue: '0'
      };
      
      if (id) {
        minimalData['_id'] = id;
      }
      
      console.log('Minimal submission data:', minimalData);
      
      const url = id ? 
        `${environment.apiUrl}/${endpoint}/${id}` : 
        `${environment.apiUrl}/${endpoint}`;
        
      const method = id ? 'PUT' : 'POST';
      const headers = new HttpHeaders().set('Content-Type', 'application/json');
      
      let response;
      if (method === 'POST') {
        response = await this.http.post(url, minimalData, { headers }).toPromise();
      } else {
        response = await this.http.put(url, minimalData, { headers }).toPromise();
      }
      
      console.log('Minimal data submission successful:', response);
      this.showSuccessMessage('Item saved with minimal data');
      return response;
    } catch (err: any) {
      console.error('Even minimal submission failed:', err);
      this.showErrorMessage('All submission methods failed');
      throw err;
    }
  }

  /**
   * Helper to show a success snackbar message
   */
  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }

  /**
   * Helper to show an error snackbar message
   */
  private showErrorMessage(message: string): void {
    this.snackBar.open(`Error: ${message}`, 'Close', { duration: 5000 });
  }

  /**
   * Verifies that the user is authenticated
   * @returns true if authenticated, false otherwise
   */
  checkAuthentication(): boolean {
    const token = this.authService.getToken();
    console.log('Authentication check - Token exists:', !!token);
    
    if (!token) {
      console.error('User must be logged in to submit');
      this.showErrorMessage('You must be logged in to save your item');
      return false;
    }
    return true;
  }
} 