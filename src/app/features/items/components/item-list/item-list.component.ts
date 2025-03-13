import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ItemService, Item } from '../../../../core/services/item.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-item-list',
  templateUrl: './item-list.component.html',
  styleUrls: ['./item-list.component.scss']
})
export class ItemListComponent implements OnInit {
  items: Item[] = [];
  loading = false;
  error: string | null = null;
  totalItems = 0;
  pageSize = 12;
  pageIndex = 0;
  searchText = '';
  selectedCategory = '';
  sortBy = 'newest';
  
  categories: string[];

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private categoriesService: CategoriesService,
    private router: Router
  ) {
    this.categories = this.categoriesService.categories;
  }

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.error = null;

    this.itemService.getItems(
      this.pageIndex,
      this.pageSize,
      this.selectedCategory,
      this.sortBy,
      this.searchText
    ).subscribe({
      next: (response) => {
        this.items = response.items;
        this.totalItems = response.total;
        this.loading = false;
      },
      error: (error) => {
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        } else {
          this.error = error.message || 'Failed to load items';
        }
        this.loading = false;
        console.error('Error loading items:', error);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadItems();
  }

  onSearch(): void {
    this.pageIndex = 0; // Reset to first page
    this.loadItems();
  }

  onCategoryChange(): void {
    this.pageIndex = 0; // Reset to first page
    this.loadItems();
  }

  onSortChange(): void {
    this.pageIndex = 0; // Reset to first page
    this.loadItems();
  }
}
