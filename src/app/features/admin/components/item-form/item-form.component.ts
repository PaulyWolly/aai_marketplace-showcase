import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { ImageCaptureDialogComponent } from '../../../../shared/components/image-capture-dialog/image-capture-dialog.component';

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
      
      const formData = this.itemForm.value;
      
      // Ensure we have at least one image
      if (this.images.length === 0) {
        this.error = 'At least one image is required';
        this.loading = false;
        this.snackBar.open('At least one image is required', 'Close', { duration: 3000 });
        return;
      }
      
      // If we have images in the array, use the first one as the main imageUrl if not already set
      if (!formData.imageUrl && formData.images && formData.images.length > 0) {
        formData.imageUrl = formData.images[0];
      }
      
      if (this.isEditMode && this.itemId) {
        // Update existing item
        await this.appraisalService.saveAppraisal({
          _id: this.itemId,
          // Preserve the original userId if this is an admin editing a member's item
          userId: this.originalItem?.userId,
          ...formData
        });
        this.snackBar.open('Item updated successfully', 'Close', { duration: 3000 });
      } else {
        // Create new item
        await this.appraisalService.saveAppraisal(formData);
        this.snackBar.open('Item created successfully', 'Close', { duration: 3000 });
      }
      
      // Navigate back to the appropriate page
      if (this.returnUrl) {
        this.router.navigateByUrl(decodeURIComponent(this.returnUrl));
      } else {
        this.router.navigate(['/admin/items']);
      }
    } catch (err) {
      console.error('Error saving item:', err);
      if (err instanceof Error) {
        this.error = err.message || 'Failed to save item';
      } else {
        this.error = 'Failed to save item';
      }
      this.snackBar.open('Failed to save item', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
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