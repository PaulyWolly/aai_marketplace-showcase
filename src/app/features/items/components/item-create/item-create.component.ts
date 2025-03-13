import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ItemService, ItemCreateData } from '../../../../core/services/item.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-item-create',
  templateUrl: './item-create.component.html',
  styleUrls: ['./item-create.component.scss']
})
export class ItemCreateComponent implements OnInit {
  itemForm: FormGroup;
  loading = false;
  error: string | null = null;

  categories = [
    'Electronics',
    'Clothing',
    'Books',
    'Home',
    'Sports'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private itemService: ItemService
  ) {
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      description: ['', Validators.required],
      imageUrl: ['', Validators.required],
      condition: ['New', Validators.required],
      seller: this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required]
      })
    });
  }

  ngOnInit(): void {
    // Any initialization logic can go here
  }

  onSubmit(): void {
    if (this.itemForm.valid) {
      this.loading = true;
      this.error = null;

      const formData = this.itemForm.value;
      const itemData: ItemCreateData = {
        name: formData.name,
        category: formData.category,
        price: formData.price,
        description: formData.description,
        imageUrl: formData.imageUrl,
        condition: formData.condition
      };

      this.itemService.createItem(itemData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (item) => {
            this.router.navigate(['/items', item._id]);
          },
          error: (error: Error) => {
            this.error = error.message || 'Failed to create item';
            console.error('Error creating item:', error);
          }
        });
    } else {
      this.markFormGroupTouched(this.itemForm);
    }
  }

  onCancel(): void {
    this.router.navigate(['/items']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }
}
