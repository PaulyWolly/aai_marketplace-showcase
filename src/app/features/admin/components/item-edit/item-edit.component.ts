import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService, Item } from '../../../../core/services/item.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-item-edit',
  templateUrl: './item-edit.component.html',
  styleUrls: ['./item-edit.component.scss']
})
export class ItemEditComponent implements OnInit {
  itemForm: FormGroup;
  loading = false;
  error: string | null = null;
  item: Item | null = null;

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
    private route: ActivatedRoute,
    private itemService: ItemService
  ) {
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      description: ['', Validators.required],
      imageUrl: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (!itemId) {
      this.error = 'No item ID provided';
      return;
    }

    this.loading = true;
    this.itemService.getItemById(itemId).subscribe({
      next: (item) => {
        this.item = item;
        this.itemForm.patchValue({
          name: item.name,
          category: item.category,
          price: item.price,
          description: item.description,
          imageUrl: item.imageUrl
        });
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load item';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.itemForm.valid && this.item) {
      this.loading = true;
      this.error = null;

      this.itemService.updateItem(this.item._id, this.itemForm.value)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            this.router.navigate(['/admin/items']);
          },
          error: (error) => {
            this.error = error.message || 'Failed to update item';
          }
        });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/items']);
  }
} 