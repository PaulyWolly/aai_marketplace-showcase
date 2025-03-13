import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService, Item } from '../../../../core/services/item.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-item-detail',
  templateUrl: './item-detail.component.html',
  styleUrls: ['./item-detail.component.scss']
})
export class ItemDetailComponent implements OnInit {
  item: Item | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itemService: ItemService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.error = null;

    this.route.params.subscribe(params => {
      const itemId = params['id'];
      if (!itemId) {
        this.error = 'Invalid item ID';
        this.loading = false;
        return;
      }

      this.itemService.getItemById(itemId)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (item) => {
            this.item = item;
          },
          error: (error: Error) => {
            this.error = error.message || 'Failed to load item details';
            console.error('Error loading item:', error);
          }
        });
    });
  }

  get sellerName(): string {
    return this.item?.seller?.name || 'Unknown Seller';
  }

  get sellerRating(): number {
    return this.item?.seller?.rating || 0;
  }

  addToCart(): void {
    if (!this.item) return;
    
    // Here you would typically call a cart service
    console.log('Adding item to cart:', this.item);
  }

  contactSeller(): void {
    if (!this.item?.seller) return;
    
    // Here you would typically open a chat/messaging component
    console.log('Contacting seller:', this.item.seller);
  }
}
