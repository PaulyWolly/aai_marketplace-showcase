import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { ImageCaptureDialogComponent } from '../../../../shared/components/image-capture-dialog/image-capture-dialog.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-member-item-form',
  templateUrl: './member-item-form.component.html',
  styleUrls: ['./member-item-form.component.scss']
})
export class MemberItemFormComponent implements OnInit {
  itemForm!: FormGroup;
  isEditMode = false;
  itemId: string | null = null;
  loading = false;
  error: string | null = null;
  categories: string[];
  conditions: string[];

  // Placeholder transparent image data URL to use when a real image isn't available
  private placeholderImage = 'data:image/png;base64,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';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private appraisalService: AppraisalService,
    private categoriesService: CategoriesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.categories = this.categoriesService.categories;
    this.conditions = this.categoriesService.conditions;
  }

  ngOnInit(): void {
    this.createForm();
    this.itemId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.itemId;

    if (this.isEditMode && this.itemId) {
      this.loadItem(this.itemId);
    }
  }

  createForm(): void {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required]],
      category: ['', [Validators.required]],
      condition: ['', [Validators.required]],
      estimatedValue: ['', [Validators.required]],
      height: [''],
      width: [''],
      weight: [''],
      imageUrl: [''],
      images: this.fb.array([]),
      appraisal: this.fb.group({
        details: ['', [Validators.required]],
        marketResearch: ['', [Validators.required]]
      })
    });
  }

  get images(): FormArray {
    return this.itemForm.get('images') as FormArray;
  }

  addImage(url: string = ''): void {
    this.images.push(this.fb.control(url));
  }

  removeImage(index: number): void {
    this.images.removeAt(index);
  }

  async loadItem(id: string): Promise<void> {
    try {
      this.loading = true;
      const item = await this.appraisalService.getAppraisalById(id);
      if (item) {
        // Handle legacy items with single imageUrl
        if (item.imageUrl && (!item.images || item.images.length === 0)) {
          this.addImage(item.imageUrl);
        }
        
        // Handle items with multiple images
        if (item.images && Array.isArray(item.images)) {
          item.images.forEach((url: string) => this.addImage(url));
        }
        
        this.itemForm.patchValue(item);
      } else {
        this.error = 'Item not found';
      }
    } catch (err) {
      console.error('Error loading item:', err);
      this.error = 'Failed to load item details';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Drastically reduces image size to ensure it can be saved
   * This creates a very small thumbnail to guarantee the save will work
   */
  private createThumbnail(dataUrl: string): Promise<string> {
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
            // Create a small thumbnail (50x50 max - even smaller to ensure it works)
            const maxSize = 50;
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
            
            // Convert to small JPEG with extremely low quality
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.05);
            console.log(`Created thumbnail: ${width}x${height}, size: ${thumbnailUrl.length} bytes`);
            
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log('File selected:', file.name, 'size:', file.size, 'type:', file.type);
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
        return;
      }
      
      // Show loading indicator
      this.snackBar.open('Processing image...', '', { duration: 2000 });
      
      // Convert the file to a data URL
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const imageUrl = reader.result as string;
          console.log(`Image loaded, original size: ${imageUrl.length} bytes`);
          
          // Create a small thumbnail version to ensure save will work
          const thumbnailUrl = await this.createThumbnail(imageUrl);
          
          // Add the image to the form array
          this.addImage(thumbnailUrl);
          console.log(`Added thumbnail to FormArray, now containing ${this.images.length} images`);
          
          // If this is the first image, set it as the main image
          if (this.images.length === 1 || !this.itemForm.get('imageUrl')?.value) {
            this.itemForm.get('imageUrl')?.setValue(thumbnailUrl);
            console.log('Set as main image URL');
          }
          
          // Update the form data directly
          this.itemForm.patchValue({
            images: this.images.value
          });
          
          // Show success message
          this.snackBar.open('Image added successfully', 'Close', { duration: 3000 });
          
          // Clear the file input so the same file can be selected again if needed
          input.value = '';
        } catch (err) {
          console.error('Error adding uploaded image:', err);
          this.snackBar.open('Error adding image. Please try again.', 'Close', { duration: 5000 });
        }
      };
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        this.snackBar.open('Error reading image file. Please try again.', 'Close', { duration: 5000 });
      };
      
      console.log('Starting to read file as data URL...');
      reader.readAsDataURL(file);
    } else {
      console.log('No file selected or file input is empty');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.itemForm.invalid) {
      return;
    }

    try {
      this.loading = true;
      this.error = null; // Clear previous errors
      
      // Log token details for debugging
      this.logToken();
      
      // Check authentication before proceeding
      if (!this.checkAuthentication()) {
        this.snackBar.open('You need to be logged in to save items. Please log in and try again.', 'Close', { duration: this.snackBarDuration });
        this.router.navigate(['/login']);
        this.loading = false;
        return;
      }
      
      // Create a fresh copy of the form data
      const formData = {...this.itemForm.value};
      
      // Log form state before processing
      console.log('Form submission started. Raw form data:', 
                  JSON.stringify({
                    name: formData.name,
                    category: formData.category,
                    condition: formData.condition,
                    hasImages: formData.images ? formData.images.length : 0,
                    hasImageUrl: !!formData.imageUrl,
                    isEditMode: this.isEditMode,
                    itemId: this.itemId
                  }));
      
      // Check if we have images
      if (formData.images && formData.images.length > 0) {
        console.log(`Found ${formData.images.length} images to process`);
        
        // Create FormData object for multipart/form-data submission
        const multipartFormData = new FormData();
        
        // Add all text fields to form data
        Object.keys(formData).forEach(key => {
          if (key !== 'images' && key !== 'imageUrl') {
            // Handle nested objects like appraisal
            if (typeof formData[key] === 'object' && formData[key] !== null) {
              multipartFormData.append(key, JSON.stringify(formData[key]));
            } else {
              multipartFormData.append(key, formData[key]);
            }
          }
        });
        
        // Add ID if in edit mode (but don't add it twice - backend handles this correctly)
        if (this.isEditMode && this.itemId) {
          multipartFormData.append('_id', this.itemId);
          console.log(`Adding item ID to form data: ${this.itemId}`);
        }
        
        // Convert base64 image to blob and add to form data
        // Use the first image in the array
        if (formData.images[0]) {
          try {
            const base64Data = formData.images[0];
            const blob = this.dataURLtoBlob(base64Data);
            
            // Always use 'image' as the field name to match the backend multer config
            multipartFormData.append('image', blob, 'image.jpg');
            console.log('Successfully added image blob to form data');
            
            // Also include the image as imageUrl to ensure it's set in the database
            multipartFormData.append('imageUrl', formData.imageUrl || formData.images[0]);
          } catch (err) {
            console.error('Error converting image to blob:', err);
          }
        }
        
        // Send multipart form data to API
        console.log('Submitting form with multipart/form-data');
        try {
          const result = await this.submitFormWithMultipart(multipartFormData);
          console.log('Form submission successful:', result);
          this.snackBar.open(this.isEditMode ? 'Item updated successfully' : 'Item created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/profile/items']);
        } catch (err) {
          console.error('Multipart form submission failed:', err);
          throw err; // Re-throw to be caught by outer catch
        }
        
      } else {
        // If no images, use the existing method
        console.log('No images found, using standard JSON submission');
        
        // Ensure essential data is prepared correctly
        const essentialData: any = {
          name: formData.name,
          category: formData.category,
          condition: formData.condition,
          estimatedValue: formData.estimatedValue,
          height: formData.height,
          width: formData.width,
          weight: formData.weight,
          imageUrl: formData.imageUrl, // Make sure imageUrl is included
          appraisal: formData.appraisal
        };
        
        // Add ID if in edit mode
        if (this.isEditMode && this.itemId) {
          essentialData._id = this.itemId;
          console.log(`Adding item ID to JSON data: ${this.itemId}`);
        }
        
        try {
          console.log('Submitting standard JSON data:', JSON.stringify(essentialData));
          const result = await this.appraisalService.saveAppraisal(essentialData);
          console.log('Standard form submission successful:', result);
          this.snackBar.open(this.isEditMode ? 'Item updated successfully' : 'Item created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/profile/items']);
        } catch (innerErr: any) {
          console.error('Standard JSON submission failed:', innerErr);
          this.error = `Failed to save item: ${innerErr.message || 'Unknown error'}`;
          this.snackBar.open(`Error saving item: ${innerErr.message || 'Unknown error'}`, 'Close', { duration: 5000 });
        }
      }
      
    } catch (err: any) {
      console.error('Save failed:', err);
      this.error = `Failed to save item: ${err.message || 'Unknown error'}`;
      this.snackBar.open(`Error saving item: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Submit form data using multipart/form-data approach
   */
  private submitFormWithMultipart(formData: FormData): Promise<any> {
    // Build the URL to submit the form to
    const baseUrl = `${environment.apiUrl}/appraisals`;
    
    // Always use the base URL for the first attempt
    // This now supports multipart form data uploads
    const url = baseUrl;
      
    // Log the URL being used
    console.log(`Submitting form to: ${url} using ${this.isEditMode ? 'PUT' : 'POST'} method`);
    
    // Verify formData contents
    formData.forEach((value, key) => {
      if (key !== 'image') {
        console.log(`${key}: ${value}`);
      } else {
        console.log(`${key}: [blob data]`);
      }
    });
    
    // Set the method based on whether we're in edit mode
    // If edit mode, we'll use PUT to the /:id endpoint
    // Otherwise, we'll use POST to the base endpoint
    const method = this.isEditMode ? 'PUT' : 'POST';
    
    // Capture reference to router and snackBar for use inside Promise
    const router = this.router;
    const snackBar = this.snackBar;
    
    return new Promise((resolve, reject) => {
      const tryRequest = (endpointUrl: string, actualMethod: string) => {
        console.log(`Trying endpoint: ${endpointUrl} with method: ${actualMethod}`);
        
        // For PUT requests with ID, append the ID to the URL
        const finalUrl = actualMethod === 'PUT' && this.itemId ? 
          `${endpointUrl}/${this.itemId}` : endpointUrl;
          
        console.log(`Final request URL: ${finalUrl}`);
        
        const xhr = new XMLHttpRequest();
        xhr.open(actualMethod, finalUrl);
        
        // Add auth token - CRITICAL for authentication
        const token = localStorage.getItem('token');
        if (token) {
          console.log('Setting Authorization header with token:', token.substring(0, 10) + '...');
          
          // IMPORTANT: Set Authorization header with 'Bearer ' prefix
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          
          // Also set content type explicitly for multipart forms
          // Note: Do NOT set content-type for multipart/form-data as it will be set automatically with boundary
        } else {
          console.error('No token found in localStorage! Authentication will fail.');
          snackBar.open('Authentication token not found. Please log in again.', 'Close', { duration: 5000 });
          router.navigate(['/login']);
          reject(new Error('Authentication token not found'));
          return;
        }
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Request successful:', xhr.status, xhr.statusText);
              resolve(response);
            } catch (err) {
              console.log('Response is not JSON but request succeeded');
              resolve(xhr.responseText);
            }
          } else if (xhr.status === 404) {
            // If 404, try the /save endpoint as a fallback
            console.log('404 received, trying /save endpoint as fallback');
            tryRequest(`${baseUrl}/save`, 'POST');
          } else if (xhr.status === 401) {
            console.error('Authentication failed! Token may be invalid or expired.');
            console.error('Response:', xhr.responseText);
            // Redirect to login page
            snackBar.open('Your session has expired. Please log in again.', 'Close', { duration: 5000 });
            router.navigate(['/login']);
            reject(new Error(`Authentication failed: ${xhr.responseText}`));
          } else {
            console.error(`Server error: ${xhr.status} ${xhr.statusText}`);
            console.error(`Response: ${xhr.responseText}`);
            reject(new Error(`Server returned ${xhr.status}: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = (event) => {
          console.error('Network error:', event);
          
          // If the direct endpoint fails, try the fallback
          if (!endpointUrl.includes('/save')) {
            console.log('Network error received, trying /save endpoint as fallback');
            tryRequest(`${baseUrl}/save`, 'POST');
          } else {
            reject(new Error('Network error occurred'));
          }
        };
        
        try {
          xhr.send(formData);
        } catch (err) {
          console.error('Error sending form data:', err);
          reject(err);
        }
      };
      
      // Start with the primary endpoint and method
      tryRequest(url, method);
    });
  }
  
  /**
   * Convert base64 data URL to Blob
   */
  private dataURLtoBlob(dataUrl: string): Blob {
    // Split the data URL to get the base64 data
    const parts = dataUrl.split(';base64,');
    const contentType = parts[0].split(':')[1] || 'image/jpeg';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    
    // Create array buffer
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
  }

  onCancel(): void {
    this.router.navigate(['/profile/items']);
  }

  openCameraCapture(): void {
    // First check if the device has camera capabilities
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.snackBar.open('Camera access not supported by your browser. Try using the upload option instead.', 'Close', { 
        duration: 5000 
      });
      return;
    }

    // Try to access the camera
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        // Get available cameras first to populate selection in dialog
        navigator.mediaDevices.enumerateDevices()
          .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const hasMultipleWebcams = videoDevices.length > 1;
            
            console.log(`Found ${videoDevices.length} video input devices`);
            
            // Open the dialog after permissions are granted
            const dialogRef = this.dialog.open(ImageCaptureDialogComponent, {
              width: '95%',
              maxWidth: '650px',
              height: 'auto',
              maxHeight: '90vh',
              disableClose: true,
              panelClass: ['camera-dialog', 'mat-dialog-no-scroll'],
              autoFocus: false,
              // Pass data to dialog component if needed
              data: {
                multipleWebcams: hasMultipleWebcams,
                availableDevices: videoDevices
              }
            });

            dialogRef.afterClosed().subscribe(result => {
              if (result && result.imageData) {
                console.log('Received image data from camera dialog:', result.imageData.substring(0, 50) + '...');
                
                try {
                  // Create a thumbnail of the camera image
                  this.createThumbnail(result.imageData).then(thumbnailUrl => {
                    console.log(`Created thumbnail from camera image, size: ${thumbnailUrl.length} bytes`);
                    
                    // Add the image to the form array
                    this.addImage(thumbnailUrl);
                    console.log(`Added camera image to FormArray, now containing ${this.images.length} images`);
                    
                    // If this is the first image, set it as the main image
                    if (this.images.length === 1 || !this.itemForm.get('imageUrl')?.value) {
                      this.itemForm.get('imageUrl')?.setValue(thumbnailUrl);
                      console.log('Set as main image URL');
                    }
                    
                    // Update the form data directly
                    this.itemForm.patchValue({
                      images: this.images.value
                    });
                    
                    // Show success message
                    this.snackBar.open('Photo added successfully', 'Close', { duration: 3000 });
                  }).catch(err => {
                    console.error('Error creating thumbnail from camera image:', err);
                    this.snackBar.open('Error processing photo. Please try again.', 'Close', { duration: 5000 });
                  });
                } catch (err) {
                  console.error('Error adding captured image:', err);
                  this.snackBar.open('Error adding photo. Please try again.', 'Close', { duration: 5000 });
                }
              } else {
                console.log('No image data received from camera dialog or dialog was cancelled');
              }
            });
          })
          .catch(err => {
            console.error('Error enumerating devices:', err);
            this.snackBar.open('Could not access camera details. Please check camera permissions.', 'Close', { 
              duration: 5000 
            });
          });
      })
      .catch(err => {
        console.error('Camera permission error:', err);
        this.snackBar.open('Camera access denied. Please enable camera permissions in your browser settings.', 'Close', { 
          duration: 5000 
        });
      });
  }

  /**
   * Verifies that the user is authenticated
   * @returns true if authenticated, false otherwise
   */
  private checkAuthentication(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found in localStorage');
      return false;
    }
    
    // If we have a token, consider the user authenticated
    // The server will validate the token properly
    console.log('Authentication token found in localStorage');
    return true;
  }
  
  // Private helper to log token information for debugging
  private logToken(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      return;
    }
    
    console.log('Token exists in localStorage, length:', token.length);
    console.log('Token starts with:', token.substring(0, 20) + '...');
    
    try {
      // Try to decode token parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Token does not have 3 parts (malformed JWT)');
        return;
      }
      
      const header = JSON.parse(atob(parts[0]));
      console.log('Token header:', header);
      
      const payload = JSON.parse(atob(parts[1]));
      console.log('Token payload:', payload);
      
      // Check expiration
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        console.log('Token expires:', expDate);
        console.log('Current time:', now);
        console.log('Token is', expDate > now ? 'still valid' : 'EXPIRED');
      }
    } catch (e) {
      console.error('Error parsing token:', e);
    }
  }
  
  // Add a class property for snackBar duration
  private snackBarDuration = 5000;
} 