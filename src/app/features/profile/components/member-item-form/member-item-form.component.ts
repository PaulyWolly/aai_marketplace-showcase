import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ImageCaptureDialogComponent } from '../../../../shared/components/image-capture-dialog/image-capture-dialog.component';
import { environment } from '../../../../../environments/environment';
import { HttpHeaders } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { SharedModule } from '../../../../shared/shared.module';
import { ShowcaseService } from '../../../../features/showcase/services/showcase.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { MLService } from '../../../../core/services/ml.service';

@Component({
  selector: 'app-member-item-form',
  templateUrl: './member-item-form.component.html',
  styleUrls: ['./member-item-form.component.scss']
})
export class MemberItemFormComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;
  itemForm!: FormGroup;
  isEditMode = false;
  itemId: string | null = null;
  loading = false;
  error: string | null = null;
  categories: string[];
  conditions: string[];
  appraisal: any;
  mlPredictions: any = null;
  imageClassification: any = null;
  similarItems: any[] = [];

  // Placeholder transparent image data URL to use when a real image isn't available
  private placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF7klEQVR4nO2dW4hWVRTHf46WmIyZloZFEQVdprLbgw8jhDb1oBYEUXQjKKiIkIpuRBe6vUWUERFEDxJBQkXRjbKrFVQjBYVYWVFmaE1q480+seCMcr7Lnm+fs9ba3/cHH877jtl7rf85e++11l4HFEVRFEVRFEVRFEVRFEVRFEVRFEVRFGVicQBwKbAG2ADsAXbnr4b/tglYnf/MFOBc4D1gCPBVfo3l7/o2cEno/6AveRI4CrgFGA8sc1h/WKyxGfD7FeDogP9X8swCngfGHJZdCRwHnARcA+zK3zcGPAecEOtgjQaZqd8DPwKrgAnAjsz9I0XXVhdjNHpg9QVyAGAbsK3L/18A7gHeBh5NMP5FrjbtJLVjNLrw5EyW+QAcnUdHvvOIB/D7ysB+A/Bb/u4bU/QZmRd5uBzQe4F9c/+GlQnlVpV9Ar9o7Mhjm0/IejNVBv4bcE5unGpDCrmNLu4G/i70aZZ5IvgwYdCvARfl1ilaYblCcqMN/ZcB/+blrcTL/XJvnJ5QAc9GahuL3KiDQ8TyHQN27KKTD7wDHASMFNSQRnNLZ4TSTyNitELGGNblrFw9XrohC8gNoZw+YtQWXJ3xjrADXuxYQb0gs1HS7mzX/pTfKSX7tBjvOVZUXgYT9jcOXCP4XS3wM4/GnLPFCswKyWxLWcdTXWTWxUNNY43b0OO6x36lGPGcIfeXiDWeZtc5xV8lmEQlYrmhqj6PldeTcxB7TbKL+AZW9JmtjwYFD5V0GJMHL/rRWj7qFZe8FnOKzCYZk5WsJdJzCacsWcKZKCRnKXaGPChVeCzGuWn6nrRU/DBwRGTdWbASy1UbU9jdljKHJNf3CcSgDxRRuMJS+X0Z6G8mknUKLCmpcMBS8T8BZJxjkdfvPJFAJzGRRd5aqvwaeBs4GXg0sP4qzwcJdFIbfwGHWOTGfvt6hqVM8++wLGGfEguybRyRQC+v6RAHxOQdS5kvJNJPj2MzZB+BFZN/nFZwU2TXn9VJV5YLV9a9/Eq2LXOlYiU3cJ8JjPw2kExI4pLVE6zG+bRyWcLj8RURlZ+KGLP3k0w7RyxA2mWQSOr0DfbHIit/ukEy48lsq7OXYpsZJfN6W09nLrZnrGqZUxLIjHnfbpRNZu+XOH14xHGEzUqYGhGZsRNZLTKLo5Tz0V0O/dZLKSKKyEwZvbSUW2Kp9TpJ5r2O/dZDaJkx4pMvC+X2CmNnZbnfod804pLJp9AyY5AeIZX3nfcTZJpjKGtD1gV1u6ld1PZQojIfy2U26hAUcZyDUNujtlHJ20y0ZITMuKkw5HmbE4Xe/c1RrpWDhIaMkJ1MijAOPOwo9wXHskOwy9GprRhbhPfWXWZ6W/YP0dJFKGIQJLo9uslMn1Cj6Ey1iHeEZ5Ndy3GRGbqXGNtCvwUHC23tOt2XhpTMWO+1bEFf4x4yfeaUxsn0nRp8psYYzw2kMynxlRnzBNIoD3jKNb3EDz3jI7MJB0wnVY2Tf6Oc45Ynpg6ZTTgf+iPTkSHXssZTU0dsR55vgHOWqSNmmYJvHTJjbAqUZqhHpqnL7PxdPxQmM3RIwk+pI+7I4ksLZLqGdKd1l3lr2pQW1V/OZ53kP3k98c0W1p8S19wQX5mvVVx/q9YhSTiKOJK6LohQZ6vWIaGZlcK5MYXQKVRyYVXP0LPkDEFmXbM1dJcZOtV0KPE1p0s9j9VYdz+yXZBpZoNLTQnZH2FHoAzjq1t+h682V5Yl+2uRlbVQ3c7x1eTRGDuTDdxlU0+3jnJJfmh9QzkqQRLCpw6Zxsu8JsBDvBMKyFyRQGZTfJBrPeQy5HOHzA8TyjT30T1BG2sQtwnnZPYWXinUfDXxeJvvHFPGu9OeGD2yfMZ3kWxvYV9PfCZ3Lhl+0J3W8Z2t+ZXnxPqF4y1YylqXCnPLGP8CU9Njl9QAAAAASUVORK5CYII=';

  // Add properties for image gallery
  imagesFormArray: FormArray;
  mainImageUrl: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private appraisalService: AppraisalService,
    private categoriesService: CategoriesService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient,
    private showcaseService: ShowcaseService,
    private mlService: MLService
  ) {
    this.categories = this.categoriesService.categories;
    this.conditions = this.categoriesService.conditions;
    
    // Initialize images form array
    this.imagesFormArray = this.fb.array([]);
  }

  ngOnInit(): void {
    this.createForm();
    this.itemId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.itemId;

    if (this.isEditMode && this.itemId) {
      this.loadItem(this.itemId);
    }

    // Load existing images if editing an item
    if (this.isEditMode && this.appraisal) {
      this.loadExistingImages();
    }
  }

  ngOnDestroy(): void {
    // Cleanup code if needed
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
    // Check if removing the main image
    const currentMainImageUrl = this.itemForm.get('imageUrl')?.value;
    const removedImageUrl = this.images.at(index).value;
    const isRemovingMainImage = currentMainImageUrl === removedImageUrl;
    
    // Remove the image from the FormArray
    this.images.removeAt(index);
    
    console.log(`Removed image at index ${index}, ${this.images.length} images remaining`);
    
    // If we removed the main image and have other images, set a new main image
    if (isRemovingMainImage && this.images.length > 0) {
      // Use the first available image as the new main image
      const newMainImageUrl = this.images.at(0).value;
      this.itemForm.get('imageUrl')?.setValue(newMainImageUrl);
      console.log('Updated main image URL after removal');
    } else if (this.images.length === 0) {
      // If no images left, clear the imageUrl
      this.itemForm.get('imageUrl')?.setValue('');
      console.log('Cleared main image URL (no images left)');
    }
    
    // Show feedback to the user
    this.snackBar.open('Image removed', 'Close', { duration: 2000 });
  }

  /**
   * Rotates an image at the specified index in the images FormArray
   * @param index The index of the image to rotate
   */
  rotateImage(index: number): void {
    if (index < 0 || index >= this.images.length) {
      console.error(`Invalid image index: ${index}`);
      return;
    }
    
    this.snackBar.open('Rotating image...', '', { duration: 1000 });
    
    try {
      // Get the image FormGroup
      const imageGroup = this.images.at(index) as FormGroup;
      const imageData = imageGroup.get('url')?.value;
      
      if (!imageData) {
        console.error('No image data to rotate');
        return;
      }
      
      // Check if the image is a URL (not a data URL)
      const isUrl = !imageData.startsWith('data:');
      console.log(`Image appears to be a ${isUrl ? 'URL' : 'data URL'}`);
      
      // Create an image element to load the image
      const img = new Image();
      
      // Handle potential CORS issues
      if (isUrl) {
        img.crossOrigin = 'Anonymous';
        console.log('Set crossOrigin to Anonymous for remote image');
      }
      
      img.onload = () => {
        try {
          // Create a canvas to draw the rotated image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('Failed to get canvas context');
            return;
          }
          
          // Set canvas dimensions based on rotation
          const degrees = 90; // Always rotate 90 degrees clockwise
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
          
          try {
            // Draw the image centered and rotated
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            // Convert back to data URL with same quality as createThumbnail
            const rotatedImageData = canvas.toDataURL('image/jpeg', 0.7);
            
            console.log('Image rotated successfully, updating form array...');
            
            // Update the FormArray with the rotated image
            imageGroup.get('url')?.setValue(rotatedImageData);
            
            // Update the main image URL if this is the main image
            if (imageGroup.get('isMain')?.value) {
              this.itemForm.get('imageUrl')?.setValue(rotatedImageData);
              this.mainImageUrl = rotatedImageData;
            }
            
            this.snackBar.open('Image rotated successfully', 'Close', { duration: 2000 });
          } catch (securityError) {
            console.error('Canvas security error:', securityError);
            this.handleCanvasSecurity(index, degrees, imageData);
          }
        } catch (drawErr) {
          console.error('Error during canvas operations:', drawErr);
          this.snackBar.open('Failed to rotate image', 'Close', { duration: 3000 });
        }
      };
      
      img.onerror = (err) => {
        console.error('Error loading image for rotation:', err);
        this.snackBar.open('Failed to rotate image', 'Close', { duration: 3000 });
      };
      
      // Add a console log before setting the image source
      console.log('Loading image for rotation, data length:', imageData.length);
      img.src = imageData;
    } catch (err) {
      console.error('Error rotating image:', err);
      this.snackBar.open('Error rotating image', 'Close', { duration: 3000 });
    }
  }
  
  /**
   * Handles CORS security issues by downloading the image first and then rotating it
   * This is a fallback for when direct canvas manipulation fails due to CORS restrictions
   */
  private handleCanvasSecurity(index: number, degrees: number, imageUrl: string): void {
    console.log('Using fallback method for CORS-restricted images');
    this.snackBar.open('Preparing image for rotation...', '', { duration: 2000 });
    
    // If the image is not a data URL, we need to download it first
    if (!imageUrl.startsWith('data:')) {
      // For remote URLs, we can try to create a thumbnail version which will convert it to a data URL
      fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            if (e.target?.result) {
              // Now we have the image as a data URL
              const dataUrl = e.target.result as string;
              // Create a thumbnail which will be CORS-safe
              const safeImageData = await this.createThumbnail(dataUrl);
              
              // Get the image FormGroup
              const imageGroup = this.images.at(index) as FormGroup;
              // Update the image in the form array
              imageGroup.get('url')?.setValue(safeImageData);
              
              // Now try rotating it again
              setTimeout(() => {
                this.rotateImage(index);
              }, 500);
            }
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.error('Error downloading image:', err);
          this.snackBar.open('Could not prepare image for rotation', 'Close', { duration: 3000 });
        });
    } else {
      // If it's already a data URL but still having CORS issues, it might be corrupt
      this.snackBar.open('Unable to rotate this image due to format restrictions', 'Close', { duration: 3000 });
    }
  }

  async loadItem(id: string): Promise<void> {
    try {
      this.loading = true;
      const item = await this.appraisalService.getAppraisalById(id);
      if (item) {
        // Store the full appraisal object for image gallery component
        this.appraisal = item;
        
        // Handle legacy items with single imageUrl
        if (item.imageUrl && (!item.images || item.images.length === 0)) {
          this.addImage(item.imageUrl);
          this.mainImageUrl = item.imageUrl;
        }
        
        // Handle items with multiple images
        if (item.images && Array.isArray(item.images)) {
          item.images.forEach((url: string) => this.addImage(url));
          
          // Set main image URL (first image by default)
          if (item.images.length > 0 && !this.mainImageUrl) {
            this.mainImageUrl = item.images[0];
          }
        }
        
        // Load images into the form array for the image gallery
        this.loadExistingImages();
        
        // Patch form values
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
   * Creates a thumbnail from an uploaded image
   * Makes the image smaller to avoid large uploads
   * @param dataUrl The data URL of the original image
   * @returns Promise with the thumbnail data URL
   */
  async createThumbnail(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Target size for thumbnails to keep uploads manageable
        const maxWidth = 1280;
        const maxHeight = 1280;
        const quality = 0.85;  // 85% quality JPEG
        
        console.log(`Creating thumbnail with max dimensions ${maxWidth}x${maxHeight}`);
        
        // Create an image to load the data URL
        const img = new Image();
        
        // Handle load errors
        img.onerror = (err) => {
          console.error('Error loading image for thumbnail creation:', err);
          reject(new Error('Could not load image for processing'));
        };
        
        // Process the image once loaded
        img.onload = () => {
          try {
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width;
            let height = img.height;
            
            // Only resize if the image is larger than our target dimensions
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                // Landscape orientation
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
              } else {
                // Portrait orientation
                width = Math.round(width * (maxHeight / height));
                height = maxHeight;
              }
              console.log(`Resizing image to ${width}x${height}`);
            } else {
              console.log(`Image is already within size limits (${width}x${height}), no resize needed`);
            }
            
            // Create a canvas to draw the resized image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            // Draw the image on the canvas
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.error('Could not get canvas context');
              reject(new Error('Could not create thumbnail canvas'));
              return;
            }
            
            // Draw with white background to handle transparent PNGs properly
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            // Draw the image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG data URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg', quality);
            console.log(`Created thumbnail: ${(thumbnailUrl.length / 1024).toFixed(2)}KB`);
            
            resolve(thumbnailUrl);
          } catch (err) {
            console.error('Error creating thumbnail:', err);
            
            // If we fail to process, return the original (with a warning)
            console.warn('Falling back to original image due to processing error');
            resolve(dataUrl);
          }
        };
        
        // Set the source to the data URL to start loading
        img.src = dataUrl;
      } catch (err) {
        console.error('Exception in thumbnail creation:', err);
        reject(err);
      }
    });
  }

  /**
   * Handles adding a new image via file upload
   * @param event The file input change event
   */
  onFileSelected(event: any): void {
    console.log('File selected event triggered');
    
    if (!event.target.files || !event.target.files.length) {
      console.warn('No file selected');
      return;
    }
    
    const file = event.target.files[0];
    console.log('File selected:', file.name, 'type:', file.type);
    
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
      return;
    }
    
    this.loading = true;
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const imageDataURL = e.target.result;
        console.log('Image loaded as data URL, processing...');
        
        // Generate thumbnail
        this.createThumbnail(imageDataURL).then(thumbnailDataURL => {
          console.log('Thumbnail generated');
          
          // Create the image object for our form
          const newImage = {
            dataURL: imageDataURL,
            thumbnailDataURL: thumbnailDataURL,
            file: file
          };
          
          // IMPORTANT: Always add to the images array
          const imagesArray = this.images;
          imagesArray.push(this.fb.control(newImage));
          console.log('Added image to FormArray. Total images:', imagesArray.length);
          
          // Set as main image ONLY if:
          // 1. This is the first image (no main image set)
          // 2. Or user explicitly chooses to set this as main
          const imageUrlControl = this.itemForm.get('imageUrl');
          const currentMainImage = imageUrlControl ? imageUrlControl.value : null;
          if (!currentMainImage || currentMainImage === '') {
            console.log('Setting as main image (first image)');
            if (imageUrlControl) {
              imageUrlControl.setValue(newImage);
            }
            this.mainImageUrl = thumbnailDataURL;
          }
          
          // Debug logs
          console.log('Current main imageUrl:', imageUrlControl ? imageUrlControl.value : 'null');
          console.log('Current images array length:', imagesArray.length);
          
          this.loading = false;
          this.snackBar.open('Image added successfully', 'Close', { duration: 3000 });
          
          // Reset the file input
          if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
          }
        }).catch(err => {
          console.error('Error generating thumbnail:', err);
          this.loading = false;
          this.snackBar.open('Error processing image', 'Close', { duration: 3000 });
        });
      } catch (error) {
        console.error('Error processing selected file:', error);
        this.loading = false;
        this.snackBar.open('Error processing image', 'Close', { duration: 3000 });
      }
    };
    
    reader.onerror = () => {
      console.error('Error reading file');
      this.loading = false;
      this.snackBar.open('Error reading file', 'Close', { duration: 3000 });
    };
    
    reader.readAsDataURL(file);
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    // Check if we're already submitting to prevent double submission
    if (this.loading) {
      console.log('Already submitting, ignoring additional submit request');
      return;
    }
    
    // Ensure user is authenticated first
    if (!this.checkAuthentication()) {
      console.error('User not authenticated, cannot submit form');
      this.snackBar.open('Please log in to save items', 'Close', { duration: this.snackBarDuration });
      return;
    }

    console.log('onSubmit called');
    
    // Check if form is valid
    if (this.itemForm.invalid) {
      this.markFormGroupTouched(this.itemForm);
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: this.snackBarDuration });
      return;
    }

    this.loading = true;
    
    // Create a copy of the form data
    let data = {...this.itemForm.value};
    
    // Debug: Check type of imageUrl before submission
    console.log('DEBUG - imageUrl before submission:', data.imageUrl);
    console.log('DEBUG - imageUrl type:', typeof data.imageUrl);
    if (Array.isArray(data.imageUrl)) {
      console.warn('WARNING: imageUrl is already an array at submission time');
    }

    // Debug: Check images array
    console.log('DEBUG - images array:', data.images);
    
    // Make sure we have the ID for edit mode
    if (this.isEditMode && this.itemId) {
      // For backward compatibility, support both _id and id
      data._id = this.itemId;
      data.id = this.itemId;
    }
    
    // Always try the multipart submission first for images
    this.tryMultipartSubmission(data).catch(err => {
      console.error('Multipart submission failed, trying minimal submission', err);
      return this.tryMinimalSubmission(data);
    }).catch(err => {
      console.error('All submission attempts failed', err);
      this.error = err.message || 'Failed to save item';
      this.snackBar.open(`Error: ${this.error}`, 'Close', { duration: this.snackBarDuration });
    }).finally(() => {
      this.loading = false;
      
      // Clear the showcase cache for this item after saving
      if (this.itemId && this.showcaseService['clearCacheForItem']) {
        console.log('Clearing showcase cache for item:', this.itemId);
        this.showcaseService['clearCacheForItem'](this.itemId);
      }
    });
  }

  /**
   * Standard API submission with proper error handling
   */
  private async sendApiSubmission(data: Record<string, any>): Promise<void> {
    try {
      console.log('Attempting standard API submission...');
      
      // Get API URL based on edit mode
      let url = `${environment.apiUrl}/appraisals`;
      const method = this.isEditMode ? 'PUT' : 'POST';
      
      // For edit mode with ID, use URL with ID parameter
      if (this.isEditMode && this.itemId) {
        url = `${environment.apiUrl}/appraisals/${this.itemId}`;
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
      this.snackBar.open(this.isEditMode ? 'Item updated successfully' : 'Item created successfully', 'Close', { duration: 3000 });
      this.router.navigate(['/profile/items']);
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
      
      this.snackBar.open(`Error: ${errorMessage}`, 'Close', { duration: this.snackBarDuration });
      
      // Re-throw so the caller can try alternative submission methods
      throw new Error(errorMessage);
    }
  }

  /**
   * Alternative submission method using multipart/form-data
   */
  private async tryMultipartSubmission(data: Record<string, any>): Promise<void> {
    console.log('Trying multipart submission...');
    
    // Create a FormData object to handle file uploads
    const formData = new FormData();
    
    // If we're in edit mode and have the original appraisal, preserve the user ID
    if (this.isEditMode && this.appraisal && this.appraisal.userId) {
      console.log('Preserving original user ID:', this.appraisal.userId);
      formData.append('userId', this.appraisal.userId);
    }
    
    // Ensure imageUrl is a string, not an array
    let imageUrl = data['imageUrl'];
    
    // If imageUrl is accidentally an array, take the first element
    if (Array.isArray(imageUrl)) {
      console.warn('imageUrl is an array - fixing by using the first element');
      imageUrl = imageUrl.length > 0 ? imageUrl[0] : '';
      data['imageUrl'] = imageUrl; // Update the data object too
    }
    
    // Create the item object with required fields
    const item = {
      name: data['name'] || '',
      category: data['category'] || '',
      condition: data['condition'] || '',
      estimatedValue: data['estimatedValue'] || '0',
      height: data['height'] || '',
      width: data['width'] || '',
      weight: data['weight'] || '',
      imageUrl: imageUrl || '',
      images: data['images'] || []
    };
    
    // Add the item object to form data
    formData.append('item', JSON.stringify(item));
    
    // Add all non-image form fields
    Object.keys(data).forEach(key => {
      if (key !== 'images') {
        if (key === 'appraisal') {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    
    // If imageUrl is a data URL, convert it to a blob and add to form data
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
      try {
        const imageBlob = this.dataURLtoBlob(imageUrl);
        formData.append('image', imageBlob, 'image.jpg');
        console.log('Added main image as blob to form data');
      } catch (err) {
        console.error('Error converting image to blob:', err);
        throw new Error('Failed to process image. Please try again with a different image.');
      }
    } else if (imageUrl) {
      // If it's a URL, pass it as is
      formData.append('imageUrl', imageUrl);
      console.log('Added main imageUrl to form data:', imageUrl);
    }
    
    // Add the images array to the form data
    if (data['images'] && Array.isArray(data['images'])) {
      console.log(`Adding ${data['images'].length} images to form data`);
      
      // Debug: Check images array content
      data['images'].forEach((img, index) => {
        console.log(`Image ${index}: ${typeof img === 'string' ? (img.length > 50 ? img.substring(0, 50) + '...' : img) : 'non-string'}`);
      });
      
      // Convert the array to a JSON string for the server to parse
      formData.append('images', JSON.stringify(data['images']));
      console.log('Appended images array as JSON string to form data');
    } else {
      console.log('No images array to add to form data');
    }
    
    // Debug log the form data being sent
    console.log('Form data being sent:', {
      isEditMode: this.isEditMode,
      itemId: this.itemId,
      userId: this.appraisal?.userId,
      hasImage: formData.has('image'),
      imageUrl: formData.get('imageUrl'),
      item: formData.get('item')
    });
    
    try {
      const result = await this.submitFormWithMultipart(formData);
      console.log('Multipart submission successful', result);
      
      // Display success message
      this.snackBar.open('Item saved successfully', 'Close', { duration: this.snackBarDuration });
      
      // If it's a new item, navigate to the showcase or profile page
      if (!this.isEditMode && result._id) {
        // Store the new ID for cache clearing
        this.itemId = result._id;
        
        // Clear showcase cache for the new item
        if (this.itemId && this.showcaseService['clearCacheForItem']) {
          console.log('Clearing showcase cache for new item:', this.itemId);
          this.showcaseService['clearCacheForItem'](this.itemId);
        }
        
        // Navigate to item's detail page or back to profile
        this.router.navigate(['/showcase/item', result._id]);
      } else if (this.isEditMode && this.itemId) {
        // Clear showcase cache for this item
        if (this.showcaseService['clearCacheForItem']) {
          console.log('Clearing showcase cache for edited item:', this.itemId);
          this.showcaseService['clearCacheForItem'](this.itemId);
        }
        
        // Navigate back to the item's detail page
        this.router.navigate(['/showcase/item', this.itemId]);
      }
    } catch (err) {
      console.error('Multipart submission error:', err);
      throw err;
    }
  }

  /**
   * Last resort submission with minimal data (dev environments only)
   */
  private async tryMinimalSubmission(data: any): Promise<void> {
    console.log('Attempting minimal submission as last resort...');
    
    // Ensure imageUrl is a string, not an array
    if (Array.isArray(data.imageUrl)) {
      console.warn('imageUrl is an array in minimal submission - fixing by using the first element');
      data.imageUrl = data.imageUrl.length > 0 ? data.imageUrl[0] : '';
    }
    
    // Simplify the data to only essential fields
    const minimalData: Record<string, any> = {
      name: data.name || '',
      category: data.category || '',
      condition: data.condition || '',
      estimatedValue: data.estimatedValue || '0',
      imageUrl: data.imageUrl || '',
      appraisal: {
        details: data.appraisal?.details || '',
        marketResearch: data.appraisal?.marketResearch || ''
      }
    };
    
    // CRITICAL: Include all images in the minimal data
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      console.log(`Adding ${data.images.length} images to minimal data`);
      minimalData['images'] = data.images;
    }
    
    // Add ID for edit mode
    if (this.isEditMode && this.itemId) {
      minimalData['_id'] = this.itemId;
      minimalData['id'] = this.itemId;
    }
    
    try {
      console.log('Sending minimal data:', minimalData);
      
      const result = await this.appraisalService.saveAppraisal(minimalData);
      console.log('Minimal submission successful:', result);
      
      // Display success message
      this.snackBar.open('Item saved successfully', 'Close', { duration: this.snackBarDuration });
      
      // Get the item ID from the result if this was a new item
      if (!this.isEditMode && result._id) {
        this.itemId = result._id;
      }
      
      // Clear the showcase cache for this item
      if (this.itemId && this.showcaseService['clearCacheForItem']) {
        console.log('Clearing showcase cache for item:', this.itemId);
        this.showcaseService['clearCacheForItem'](this.itemId);
      }
      
      // Navigate to appropriate page
      if (this.isEditMode) {
        // Go to the item detail page
        this.router.navigate(['/showcase/item', this.itemId]);
      } else if (result._id) {
        // For new items, go to the item detail page
        this.router.navigate(['/showcase/item', result._id]);
      } else {
        // Fallback to profile page
        this.router.navigate(['/profile/items']);
      }
    } catch (err) {
      console.error('Minimal submission error:', err);
      throw err;
    }
  }

  onCancel(): void {
    this.router.navigate(['/profile/items']);
  }

  openCameraCapture(): void {
    // First check if the user is authenticated
    if (!this.checkAuthentication()) {
      this.snackBar.open('Please log in to take photos', 'Close', { duration: 3000 });
      return;
    }
    
    // Check if the device has camera capabilities
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
              if (!result) {
                console.log('Dialog was closed without any result');
                return;
              }
              
              if (result.error) {
                console.error('Error from camera dialog:', result.error);
                this.snackBar.open(`Camera error: ${result.error}`, 'Close', { duration: 3000 });
                return;
              }
              
              if (result.imageData) {
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
        let errorMessage = 'Camera access denied. Please enable camera permissions in your browser settings.';
        
        // Provide more specific error messages based on the error
        if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on your device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Your camera does not support the required features.';
        } else if (err.name === 'AbortError') {
          errorMessage = 'Camera access was aborted.';
        }
        
        this.snackBar.open(errorMessage, 'Close', { 
          duration: 5000 
        });
      });
  }

  /**
   * Checks if the user is currently authenticated
   * @returns boolean indicating whether the user is authenticated
   */
  private checkAuthentication(): boolean {
    if (!this.authService) {
      console.error('AuthService not available');
      return false;
    }
    
    const token = this.authService.getToken();
    if (!token) {
      console.warn('No authentication token found');
      return false;
    }
    
    // Check if token is expired
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
      
      if (Date.now() >= expirationTime) {
        console.warn('Authentication token is expired');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error parsing authentication token:', err);
      return false;
    }
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

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  private submitFormWithMultipart(formData: FormData): Promise<any> {
    // Debug logging for form data
    console.log('Submitting with multipart form data');
    console.log('FormData contents:');
    
    // Use a safer approach to iterate through FormData
    const formDataKeys: string[] = [];
    formData.forEach((value, key) => {
      // Don't log the full image content as it's too large
      if (key === 'image' || (typeof value === 'string' && value.length > 500)) {
        console.log(`${key}: [Large binary or string data]`);
      } else {
        console.log(`${key}: ${value}`);
      }
      formDataKeys.push(key);
    });
    
    // Check for required fields
    const requiredFields = ['name', 'category', 'condition', 'estimatedValue'];
    const missingFields = requiredFields.filter(field => !formDataKeys.includes(field));
    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(', ')}`);
      return Promise.reject(new Error(`Missing required fields: ${missingFields.join(', ')}`));
    }
    
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
      
      // Get a fresh token before submitting
      const token = authService.getToken();
      
      if (!token) {
        console.error('No token available for authentication');
        snackBar.open('Your session has expired. Please log in again.', 'Close', { duration: 5000 });
        
        // Redirect to login
        authService.logout();
        router.navigate(['/login']);
        reject(new Error('No authentication token available'));
        return;
      }
      
      console.log('Setting Authorization header with token');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
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
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('XHR success response:', xhr.response);
          try {
            // With responseType='json', response is already parsed
            const response = xhr.response;
            if (response) {
              resolve(response);
            } else {
              console.warn('Empty response received (status OK)');
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
          if (xhr.status === 401 || xhr.status === 403) {
            errorDetail = 'Your session has expired. Please log in again.';
            console.error('Authentication error - token may be expired');
            snackBar.open(errorDetail, 'Log In', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            })
            .onAction()
            .subscribe(() => {
              authService.logout();
              router.navigate(['/login']);
            });
            
            // Automatically redirect after a short delay
            setTimeout(() => {
              authService.logout();
              router.navigate(['/login']);
            }, 3000);
          } else if (xhr.status === 413) {
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
          
          reject(new Error(errorDetail));
        }
      };
      
      xhr.onerror = function() {
        console.error('XHR network error');
        reject(new Error('Network error occurred. Please check your internet connection.'));
      };
      
      xhr.ontimeout = function() {
        console.error('XHR request timed out');
        reject(new Error('Request timed out - the image might be too large. Please try a smaller image.'));
      };
      
      // Increase timeout for large requests
      xhr.timeout = 120000; // 120 seconds
      
      // Log that we're about to send
      console.log('Sending FormData with XHR...');
      try {
        xhr.send(formData);
      } catch (err) {
        console.error('Error sending XHR request:', err);
        reject(new Error('Failed to send request: ' + (err as Error).message));
      }
    });
  }

  /**
   * Convert base64 data URL to Blob
   */
  private dataURLtoBlob(dataUrl: string): Blob {
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
      
      try {
        // Ensure we have valid base64 content
        let base64Data = parts[1];
        
        // Clean up any potential whitespace or newlines
        base64Data = base64Data.replace(/\s/g, '');
        
        // Verify base64 pattern (roughly)
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
        
        // Add size logging
        console.log(`Decoded data size: ${rawLength} bytes`);
        
        // Create array buffer
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        
        // Create and return the blob
        const blob = new Blob([uInt8Array], { type: contentType });
        console.log(`Created blob of type ${contentType}, size: ${blob.size} bytes`);
        
        // Validate blob size (should not be too small)
        if (blob.size < 100) {
          console.warn('Created blob is suspiciously small, might be corrupted');
          return new Blob([], { type: contentType });
        }
        
        return blob;
      } catch (atobError) {
        console.error('Error decoding base64 data:', atobError);
        
        // Create fallback blank image blob
        console.log('Using fallback blank image blob');
        return new Blob([], { type: contentType });
      }
    } catch (err) {
      console.error('Critical error in dataURLtoBlob:', err);
      return new Blob([], { type: 'image/jpeg' });
    }
  }

  /**
   * Load existing images from appraisal data into form array
   */
  private loadExistingImages() {
    if (this.appraisal && this.appraisal['images'] && this.appraisal['images'].length > 0) {
      // Clear the existing array
      while (this.imagesFormArray.length) {
        this.imagesFormArray.removeAt(0);
      }
      
      // Add each image to the form array
      this.appraisal['images'].forEach((imgUrl: string, index: number) => {
        const isMain = index === 0; // Assuming first image is main
        this.imagesFormArray.push(this.fb.group({
          url: [imgUrl],
          isMain: [isMain]
        }));
        
        // Set main image
        if (isMain) {
          this.mainImageUrl = imgUrl;
        }
      });
    }
  }
  
  /**
   * Handle main image change from gallery component
   */
  onMainImageChange(newUrl: string) {
    this.mainImageUrl = newUrl;
  }
  
  /**
   * Handle images array change from gallery component
   */
  onImagesChange(newImages: FormArray) {
    this.imagesFormArray = newImages;
  }

  /**
   * Get price prediction for the current item
   */
  async getPricePrediction(): Promise<void> {
    try {
      const formData = this.itemForm.value;
      const predictionData = [{
        id: formData._id || 'new',
        height: parseFloat(formData.height) || 0,
        width: parseFloat(formData.width) || 0,
        weight: parseFloat(formData.weight) || 0,
        category: formData.category,
        condition: formData.condition,
        age: parseFloat(formData.age) || 0,
        rarity: parseFloat(formData.rarity) || 0.5,
        estimatedValue: parseFloat(formData.estimatedValue) || 0
      }];

      this.mlService.predictPrice(predictionData).subscribe(
        (predictions) => {
          this.mlPredictions = predictions[0];
          this.snackBar.open(
            `Predicted value: $${this.mlPredictions.predicted_value.toFixed(2)} (${(this.mlPredictions.confidence * 100).toFixed(1)}% confidence)`,
            'Close',
            { duration: 5000 }
          );
        },
        (error) => {
          console.error('Price prediction error:', error);
          this.snackBar.open('Failed to get price prediction', 'Close', { duration: 3000 });
        }
      );
    } catch (error) {
      console.error('Error preparing price prediction:', error);
      this.snackBar.open('Error preparing price prediction', 'Close', { duration: 3000 });
    }
  }

  /**
   * Classify the current item's image
   */
  async classifyCurrentImage(): Promise<void> {
    try {
      const imageUrl = this.itemForm.get('imageUrl')?.value;
      if (!imageUrl) {
        this.snackBar.open('No image available for classification', 'Close', { duration: 3000 });
        return;
      }

      this.mlService.classifyImage(imageUrl).subscribe(
        (classification) => {
          this.imageClassification = classification;
          this.snackBar.open(
            `Classified as: ${classification.category} (${(classification.confidence * 100).toFixed(1)}% confidence)`,
            'Close',
            { duration: 5000 }
          );
        },
        (error) => {
          console.error('Image classification error:', error);
          this.snackBar.open('Failed to classify image', 'Close', { duration: 3000 });
        }
      );
    } catch (error) {
      console.error('Error preparing image classification:', error);
      this.snackBar.open('Error preparing image classification', 'Close', { duration: 3000 });
    }
  }

  /**
   * Find similar items
   */
  async findSimilarItems(): Promise<void> {
    try {
      const itemId = this.itemForm.get('_id')?.value;
      if (!itemId) {
        this.snackBar.open('Cannot find similar items for unsaved items', 'Close', { duration: 3000 });
        return;
      }

      this.mlService.findSimilarItems(itemId).subscribe(
        (items) => {
          this.similarItems = items;
          this.snackBar.open(`Found ${items.length} similar items`, 'Close', { duration: 3000 });
        },
        (error) => {
          console.error('Similar items error:', error);
          this.snackBar.open('Failed to find similar items', 'Close', { duration: 3000 });
        }
      );
    } catch (error) {
      console.error('Error finding similar items:', error);
      this.snackBar.open('Error finding similar items', 'Close', { duration: 3000 });
    }
  }
} 