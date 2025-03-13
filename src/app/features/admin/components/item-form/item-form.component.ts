import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { CategoriesService } from '../../../../core/services/categories.service';

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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private appraisalService: AppraisalService,
    private categoriesService: CategoriesService,
    private snackBar: MatSnackBar
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
      imageUrl: ['', [Validators.required]],
      appraisal: this.fb.group({
        details: ['', [Validators.required]],
        marketResearch: ['', [Validators.required]]
      })
    });
  }

  async loadItem(id: string): Promise<void> {
    try {
      this.loading = true;
      const item = await this.appraisalService.getAppraisalById(id);
      if (item) {
        this.originalItem = item;
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
      
      // Check if we came from a specific user's items view
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      if (returnUrl) {
        this.router.navigateByUrl(returnUrl);
      } else {
        this.router.navigate(['/admin/items']);
      }
    } catch (err) {
      console.error('Error saving item:', err);
      this.error = 'Failed to save item';
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    // Check if we came from a specific user's items view
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/admin/items']);
    }
  }
} 