import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ShowcaseService } from '../../services/showcase.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { Appraisal } from '../../../appraisal/services/appraisal.service';

@Component({
  selector: 'app-showcase',
  templateUrl: './showcase.component.html',
  styleUrls: ['./showcase.component.scss']
})
export class ShowcaseComponent implements OnInit {
  items: Appraisal[] = [];
  filteredItems: Appraisal[] = [];
  loading = false;
  error: string | null = null;
  searchText = '';
  selectedCategory = '';
  sortBy = 'newest';
  
  categories: string[];

  constructor(
    private showcaseService: ShowcaseService,
    private categoriesService: CategoriesService,
    private router: Router
  ) {
    this.categories = this.categoriesService.categories;
  }

  ngOnInit(): void {
    this.loadItems();
  }

  async loadItems(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      const items = await this.showcaseService.getShowcaseItems();
      if (items) {
        this.items = items;
        this.applyFilters();
      } else {
        this.items = [];
        this.filteredItems = [];
      }
    } catch (err) {
      console.error('Error loading showcase items:', err);
      this.error = 'Failed to load showcase items';
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    let result = [...this.items];
    
    // Apply category filter
    if (this.selectedCategory) {
      result = result.filter(item => item.category === this.selectedCategory);
    }
    
    // Apply search filter
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchLower) || 
        item.category.toLowerCase().includes(searchLower) ||
        item.condition.toLowerCase().includes(searchLower) ||
        (item.appraisal.details && item.appraisal.details.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply sorting
    if (this.sortBy === 'newest') {
      result.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
    } else if (this.sortBy === 'price_asc') {
      result.sort((a, b) => {
        const priceA = this.extractPrice(a.estimatedValue);
        const priceB = this.extractPrice(b.estimatedValue);
        return priceA - priceB;
      });
    } else if (this.sortBy === 'price_desc') {
      result.sort((a, b) => {
        const priceA = this.extractPrice(a.estimatedValue);
        const priceB = this.extractPrice(b.estimatedValue);
        return priceB - priceA;
      });
    }
    
    this.filteredItems = result;
  }
  
  private extractPrice(priceString: string): number {
    if (!priceString) return 0;
    
    // Try to extract a number from the price string
    const matches = priceString.match(/(\d+(\.\d+)?)/);
    if (matches && matches[1]) {
      return parseFloat(matches[1]);
    }
    return 0;
  }

  onSearch(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }
  
  viewItemDetails(item: Appraisal): void {
    if (item._id) {
      this.router.navigate(['/showcase/item', item._id]);
    }
  }
} 