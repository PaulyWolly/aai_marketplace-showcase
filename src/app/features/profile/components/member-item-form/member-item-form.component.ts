import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { AuthService } from '../../../../core/services/auth.service';
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
    private authService: AuthService,
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

  /**
   * Rotates an image at the specified index in the images FormArray
   * @param index The index of the image to rotate
   * @param degrees The number of degrees to rotate (90, 180, 270)
   */
  rotateImage(index: number, degrees: number): void {
    if (index < 0 || index >= this.images.length) {
      console.error(`Invalid image index: ${index}`);
      return;
    }
    
    this.snackBar.open('Rotating image...', '', { duration: 1000 });
    
    try {
      const imageData = this.images.at(index).value;
      if (!imageData) {
        console.error('No image data to rotate');
        return;
      }
      
      // Create an image element to load the image
      const img = new Image();
      img.onload = () => {
        // Create a canvas to draw the rotated image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Failed to get canvas context');
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
        
        // Translate and rotate the canvas context
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        // Convert back to data URL with same quality as createThumbnail
        const rotatedImageData = canvas.toDataURL('image/jpeg', 0.7);
        
        // Update the FormArray with the rotated image
        this.images.at(index).setValue(rotatedImageData);
        
        // Update the main image URL if this is the first image
        if (index === 0 || this.images.length === 1) {
          this.itemForm.get('imageUrl')?.setValue(rotatedImageData);
        }
        
        this.snackBar.open('Image rotated successfully', 'Close', { duration: 2000 });
      };
      
      img.onerror = (err) => {
        console.error('Error loading image for rotation:', err);
        this.snackBar.open('Failed to rotate image', 'Close', { duration: 3000 });
      };
      
      img.src = imageData;
    } catch (err) {
      console.error('Error rotating image:', err);
      this.snackBar.open('Error rotating image', 'Close', { duration: 3000 });
    }
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
   * Reduces image size to ensure it can be saved while maintaining reasonable quality
   * This creates a medium-sized image with better quality
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
            // Create a medium-sized image (increased from 50 to 400px max)
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
            
            // Convert to JPEG with improved quality (increased from 0.05 to 0.7)
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
            
            // Also include all images array as a JSON string to ensure it's saved in the database
            multipartFormData.append('images', JSON.stringify(formData.images));
            console.log(`Added all ${formData.images.length} images to form data as JSON array`);
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
    // Log form data for debugging
    console.log('Submitting with multipart form data');
    // We can't easily log keys from FormData in a type-safe way, so we'll skip that
    
    // Capture references to use inside the Promise
    const router = this.router;
    const snackBar = this.snackBar;
    const itemId = this.itemId;
    const editMode = this.isEditMode;
    const authService = this.authService;
    
    return new Promise<any>((resolve, reject) => {
      // Construct URL
      let url = `${environment.apiUrl}/appraisals`;
      
      // For edit mode, include the itemId in the URL path and not in the formData as '_id'
      if (editMode && itemId) {
        // Use /:id pattern for MongoDB ObjectId path parameter
        url = `${environment.apiUrl}/appraisals/${itemId}`;
        
        // Debug log the constructed URL
        console.log(`Edit mode URL with itemId: ${url}`);
      }
      
      console.log('Submitting to URL:', url);
      
      const xhr = new XMLHttpRequest();
      xhr.open(editMode ? 'PUT' : 'POST', url);
      
      // Set auth headers
      const token = authService.getToken();
      if (token) {
        console.log('Setting Authorization header with token');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      } else {
        console.error('No token available for authentication');
        this.error = 'Authentication failed - please log in again';
        this.loading = false;
        reject(new Error('No authentication token available'));
        return;
      }
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('XHR success response:', xhr.responseText);
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (err) {
            console.error('Error parsing response:', err);
            reject(err);
          }
        } else {
          console.error(`Server error: ${xhr.status} ${xhr.statusText}`, xhr.responseText);
          
          // Special handling for 404 - try fallback
          if (xhr.status === 404) {
            // If 404, try the /save endpoint as a fallback
            console.log('404 received, trying /save endpoint as fallback');
            const fallbackUrl = `${environment.apiUrl}/appraisals/save`;
            console.log('Trying fallback URL:', fallbackUrl);
            
            const fallbackXhr = new XMLHttpRequest();
            fallbackXhr.open('POST', fallbackUrl);
            if (token) {
              fallbackXhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            
            // For fallback, include _id in formData
            if (editMode && itemId) {
              formData.append('_id', itemId);
            }
            
            fallbackXhr.onload = function() {
              if (fallbackXhr.status >= 200 && fallbackXhr.status < 300) {
                console.log('Fallback XHR success response:', fallbackXhr.responseText);
                try {
                  const response = JSON.parse(fallbackXhr.responseText);
                  resolve(response);
                } catch (err) {
                  console.error('Error parsing fallback response:', err);
                  reject(err);
                }
              } else {
                console.error(`Fallback server error: ${fallbackXhr.status}`, fallbackXhr.responseText);
                reject(new Error(`Server returned ${fallbackXhr.status}: ${fallbackXhr.statusText}`));
              }
            };
            
            fallbackXhr.onerror = function() {
              console.error('Fallback XHR network error');
              reject(new Error('Network error occurred during fallback request'));
            };
            
            fallbackXhr.send(formData);
          } else if (xhr.status === 401) {
            console.error('Authentication failed! Token may be invalid or expired.');
            snackBar.open('Authentication failed. Please log in again.', 'Close', { duration: 5000 });
            router.navigate(['/login']);
            reject(new Error('Authentication failed'));
          } else {
            reject(new Error(`Server returned ${xhr.status}: ${xhr.statusText}`));
          }
        }
      };
      
      xhr.onerror = function() {
        console.error('XHR network error');
        reject(new Error('Network error occurred'));
      };
      
      xhr.send(formData);
    });
  }
  
  /**
   * Convert base64 data URL to Blob
   */
  private dataURLtoBlob(dataUrl: string): Blob {
    try {
      // Check if the dataUrl is valid
      if (!dataUrl || !dataUrl.includes(';base64,')) {
        console.warn('Invalid data URL format, using fallback empty blob');
        return new Blob([], { type: 'image/jpeg' });
      }
      
      // Split the data URL to get the base64 data
      const parts = dataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'image/jpeg';
      
      try {
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        
        // Create array buffer
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        
        return new Blob([uInt8Array], { type: contentType });
      } catch (atobError) {
        console.error('Error decoding base64 data:', atobError);
        return new Blob([], { type: 'image/jpeg' });
      }
    } catch (err) {
      console.error('Critical error in dataURLtoBlob:', err);
      return new Blob([], { type: 'image/jpeg' });
    }
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
                  // Show loading indicator
                  this.snackBar.open('Processing camera image...', '', { duration: 2000 });
                  
                  // Create a thumbnail of the camera image - same process as file upload
                  this.createThumbnail(result.imageData).then(thumbnailUrl => {
                    console.log(`Created image from camera: ${thumbnailUrl.length} bytes`);
                    
                    // Add the image to the form array
                    this.addImage(thumbnailUrl);
                    console.log(`Added camera image to FormArray, now containing ${this.images.length} images`);
                    
                    // If this is the first image, set it as the main image
                    if (this.images.length === 1 || !this.itemForm.get('imageUrl')?.value) {
                      this.itemForm.get('imageUrl')?.setValue(thumbnailUrl);
                      console.log('Set camera image as main image URL');
                    }
                    
                    // Update the form data directly
                    this.itemForm.patchValue({
                      images: this.images.value
                    });
                    
                    // Show success message
                    this.snackBar.open('Camera photo added successfully', 'Close', { duration: 3000 });
                    
                    // Immediately save the image to the server if we already have other form data filled
                    if (this.itemForm.valid && this.isEditMode) {
                      console.log('Form is valid and in edit mode - auto-saving image');
                      this.onSubmit();
                    }
                  }).catch(err => {
                    console.error('Error creating image from camera:', err);
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
    const token = this.authService.getToken();
    console.log('Authentication check - Token exists:', !!token);
    
    if (!token) {
      console.error('User must be logged in to submit an item');
      this.error = 'You must be logged in to submit an item';
      this.loading = false;
      this.snackBar.open('Please log in to save your item', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return false;
    }
    return true;
  }
  
  // Private helper to log token information for debugging
  private logToken(): void {
    const token = this.authService.getToken();
    console.log('Token exists:', !!token);
    if (token) {
      console.log('Token length:', token.length);
      const parts = token.split('.');
      console.log('Token has expected format (3 parts):', parts.length === 3);
      
      // Check expiration if it's a JWT
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          const expTime = payload.exp * 1000; // Convert to milliseconds
          const currentTime = Date.now();
          console.log('Token expiration:', new Date(expTime).toLocaleString());
          console.log('Current time:', new Date(currentTime).toLocaleString());
          console.log('Token expired:', expTime < currentTime);
        } catch (e) {
          console.error('Error parsing token payload:', e);
        }
      }
    } else {
      console.log('Token is not available');
    }
  }
  
  // Add a class property for snackBar duration
  private snackBarDuration = 5000;
} 