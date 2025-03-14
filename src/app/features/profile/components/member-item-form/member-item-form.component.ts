import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { ImageCaptureDialogComponent } from '../../../../shared/components/image-capture-dialog/image-capture-dialog.component';

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

  async onSubmit(): Promise<void> {
    if (this.itemForm.invalid) {
      return;
    }

    try {
      this.loading = true;
      const formData = this.itemForm.value;
      
      // If we have images in the array, use the first one as the main imageUrl
      if (formData.images && formData.images.length > 0) {
        formData.imageUrl = formData.images[0];
      }
      
      if (this.isEditMode && this.itemId) {
        // Update existing item
        await this.appraisalService.saveAppraisal({
          _id: this.itemId,
          ...formData
        });
        this.snackBar.open('Item updated successfully', 'Close', { duration: 3000 });
      } else {
        // Create new item
        await this.appraisalService.saveAppraisal(formData);
        this.snackBar.open('Item created successfully', 'Close', { duration: 3000 });
      }
      
      this.router.navigate(['/profile/items']);
    } catch (err) {
      console.error('Error saving item:', err);
      this.error = 'Failed to save item';
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/profile/items']);
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
      };
      reader.readAsDataURL(file);
    }
  }
} 