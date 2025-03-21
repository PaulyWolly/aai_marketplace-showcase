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
  selector: 'app-item-form',
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss']
})
export class ItemFormComponent implements OnInit {
  itemForm!: FormGroup;
  isEditMode = false;
  itemId: string | null = null;
  loading = false;
  error: string | null = null;
  categories: string[];
  conditions: string[];
  originalItem: Appraisal | null = null;
  returnUrl: string | null = null;

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
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

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
      imageUrl: ['', [Validators.required]],
      images: this.fb.array([]),
      appraisal: this.fb.group({
        details: ['', [Validators.required]],
        marketResearch: ['', [Validators.required]]
      }),
      isPublished: [true]
    });
  }

  get images(): FormArray {
    return this.itemForm.get('images') as FormArray;
  }

  addImage(url: string = ''): void {
    this.images.push(this.fb.control(url));
  }

  removeImage(index: number): void {
    // If removing the main image, set a new main image if available
    const imageUrl = this.itemForm.get('imageUrl')?.value;
    const removedUrl = this.images.at(index).value;
    
    if (imageUrl === removedUrl && this.images.length > 1) {
      // Find the next available image to set as main
      const newMainIndex = index === 0 ? 1 : 0;
      this.itemForm.get('imageUrl')?.setValue(this.images.at(newMainIndex).value);
    }
    
    this.images.removeAt(index);
  }

  setMainImage(index: number): void {
    const imageUrl = this.images.at(index).value;
    this.itemForm.get('imageUrl')?.setValue(imageUrl);
  }

  async loadItem(id: string): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      console.log('Loading item with ID:', id);
      
      // Add a timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
      });
      
      // Race the item loading against the timeout
      const item = await Promise.race([
        this.appraisalService.getAppraisalById(id),
        timeoutPromise
      ]);
      
      console.log('Item loaded:', item);
      
      if (item) {
        this.originalItem = item;
        
        // Ensure we have the appraisal object
        if (!item.appraisal) {
          item.appraisal = {
            details: '',
            marketResearch: ''
          };
        }
        
        // Clear existing images array
        while (this.images.length) {
          this.images.removeAt(0);
        }
        
        // Handle legacy items with single imageUrl
        if (item.imageUrl && (!item.images || item.images.length === 0)) {
          this.addImage(item.imageUrl);
        }
        
        // Handle items with multiple images
        if (item.images && Array.isArray(item.images)) {
          item.images.forEach((url: string) => this.addImage(url));
        }
        
        this.itemForm.patchValue(item);
        
        // If the form doesn't have isPublished field, add it
        if (!this.itemForm.get('isPublished')) {
          this.itemForm.addControl('isPublished', this.fb.control(item.isPublished !== false));
        } else {
          this.itemForm.get('isPublished')?.setValue(item.isPublished !== false);
        }
      } else {
        this.error = 'Item not found';
        console.error('Item not found for ID:', id);
      }
    } catch (err) {
      console.error('Error loading item:', err);
      if (err instanceof Error) {
        this.error = err.message || 'Failed to load item details';
      } else {
        this.error = 'Failed to load item details';
      }
    } finally {
      this.loading = false;
    }
  }

  openCameraCapture(): void {
    // First ensure we have camera permissions
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        // Open the dialog after permissions are granted
        const dialogRef = this.dialog.open(ImageCaptureDialogComponent, {
          width: '520px',
          height: '550px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          disableClose: true,
          panelClass: 'camera-dialog',
          autoFocus: false
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.imageData) {
            this.addImage(result.imageData);
            
            // If this is the first image, set it as the main image
            if (this.images.length === 1 || !this.itemForm.get('imageUrl')?.value) {
              this.itemForm.get('imageUrl')?.setValue(result.imageData);
            }
          }
        });
      })
      .catch(err => {
        console.error('Camera permission error:', err);
        this.snackBar.open('Camera access denied. Please enable camera permissions.', 'Close', { 
          duration: 5000 
        });
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
        return;
      }
      
      // Convert the file to a data URL
      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result as string;
        this.addImage(imageUrl);
        
        // If this is the first image, set it as the main image
        if (this.images.length === 1 || !this.itemForm.get('imageUrl')?.value) {
          this.itemForm.get('imageUrl')?.setValue(imageUrl);
        }
      };
      reader.readAsDataURL(file);
      
      // Reset the input so the same file can be selected again
      input.value = '';
    }
  }

  async onSubmit(): Promise<void> {
    if (this.itemForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.itemForm.controls).forEach(key => {
        const control = this.itemForm.get(key);
        control?.markAsTouched();
        
        // If it's a FormGroup, mark all its children as touched
        if (control instanceof FormGroup) {
          Object.keys(control.controls).forEach(childKey => {
            control.get(childKey)?.markAsTouched();
          });
        }
      });
      
      this.snackBar.open('Please fix the validation errors', 'Close', { duration: 3000 });
      return;
    }

    try {
      this.loading = true;
      this.error = null;
      
      // Get form data
      const formData = {...this.itemForm.value};
      
      // Check if we have images
      if (formData.images && formData.images.length > 0) {
        // Create FormData object for multipart/form-data submission
        const multipartFormData = new FormData();
        
        // Add form fields to FormData
        Object.keys(formData).forEach(key => {
          if (key !== 'images') {
            if (key === 'appraisal') {
              multipartFormData.append(key, JSON.stringify(formData[key]));
            } else if (key === 'isPublished') {
              multipartFormData.append(key, formData[key] ? 'true' : 'false');
            } else {
              multipartFormData.append(key, formData[key]);
            }
          }
        });
        
        // Add ID if in edit mode
        if (this.isEditMode && this.itemId) {
          multipartFormData.append('_id', this.itemId);
          multipartFormData.append('id', this.itemId);
        }
        
        // Convert base64 image to blob and add to form data
        // Get the main image from the form
        if (formData.imageUrl) {
          try {
            // Check if the image is a data URL (from the camera or file upload)
            if (formData.imageUrl.startsWith('data:')) {
              const blob = this.dataURLtoBlob(formData.imageUrl);
              multipartFormData.append('image', blob, 'image.jpg');
            } else {
              // If it's a URL, pass it as is
              multipartFormData.append('imageUrl', formData.imageUrl);
            }
          } catch (err) {
            console.error('Error processing image:', err);
            this.snackBar.open('Error processing image. Please try again.', 'Close', { duration: 3000 });
            this.loading = false;
            return;
          }
        }
        
        // Submit the form data using XHR to support multipart/form-data
        const result = await this.submitFormWithMultipart(multipartFormData);
        
        this.snackBar.open(this.isEditMode ? 'Item updated successfully' : 'Item created successfully', 'Close', { duration: 3000 });
        
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.router.navigate(['/admin/items']);
        }
      } else {
        // Standard submission without file upload
        console.warn('No images found, using standard JSON submission');
        
        // Ensure required data is present
        if (!formData.imageUrl) {
          this.snackBar.open('Please add at least one image', 'Close', { duration: 3000 });
          this.loading = false;
          return;
        }
        
        const result = await this.appraisalService.saveAppraisal(formData);
        
        this.snackBar.open(this.isEditMode ? 'Item updated successfully' : 'Item created successfully', 'Close', { duration: 3000 });
        
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.router.navigate(['/admin/items']);
        }
      }
    } catch (err: any) {
      console.error('Error saving item:', err);
      this.error = err.message || 'Failed to save item';
      this.snackBar.open(`Error: ${this.error}`, 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Submit form data using multipart/form-data approach
   */
  private submitFormWithMultipart(formData: FormData): Promise<any> {
    const url = this.isEditMode && this.itemId
      ? `${environment.apiUrl}/items/${this.itemId}`
      : `${environment.apiUrl}/items`;
      
    const method = this.isEditMode ? 'PUT' : 'POST';
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      
      // Add auth token
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (err) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Server returned ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = () => {
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
      // Split the data URL to get the base64 data
      const parts = dataUrl.split(';base64,');
      
      if (parts.length !== 2) {
        throw new Error('Invalid data URL format');
      }
      
      const contentType = parts[0].split(':')[1] || 'image/jpeg';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      
      // Create array buffer
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      
      return new Blob([uInt8Array], { type: contentType });
    } catch (err) {
      console.error('Error converting data URL to blob:', err);
      throw err;
    }
  }

  onCancel(): void {
    // Check if we came from a specific user's items view
    if (this.returnUrl) {
      this.router.navigateByUrl(decodeURIComponent(this.returnUrl));
    } else {
      this.router.navigate(['/admin/items']);
    }
  }
} 