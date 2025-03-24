import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ShowcaseService } from '../../services/showcase.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { Appraisal } from '../../../appraisal/services/appraisal.service';
import { AuthService } from '../../../../core/services/auth.service';

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
  userId: string | null = null;
  userName: string | null = null;
  isAdmin = false;
  
  categories: string[];

  constructor(
    private showcaseService: ShowcaseService,
    private categoriesService: CategoriesService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.categories = this.categoriesService.categories;
  }

  ngOnInit(): void {
    // Check if admin for additional features
    this.authService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
    
    // Clear the cache on init to ensure fresh data
    if (this.showcaseService['clearCache']) {
      console.log('Clearing showcase cache on component initialization');
      this.showcaseService['clearCache']();
    }
    
    // Check for userId parameter
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('userId');
      
      // If userId is provided, we're in user-specific view
      if (this.userId) {
        // Get user's name if possible
        this.authService.getBasicUserInfo(this.userId).subscribe({
          next: (user) => {
            if (user) {
              this.userName = `${user.firstName} ${user.lastName}`;
            }
          },
          error: (err) => {
            console.error('Error fetching user details:', err);
          }
        });
      }
      
      this.loadItems();
    });
  }

  async loadItems(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      let items: Appraisal[] | undefined;
      
      // If userId is provided, fetch only that user's items
      if (this.userId) {
        console.log(`Loading items for user: ${this.userId}`);
        items = await this.showcaseService.getUserItems(this.userId);
      } else {
        items = await this.showcaseService.getShowcaseItems();
      }
      
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
        (item.name?.toLowerCase().includes(searchLower) || false) || 
        (item.category?.toLowerCase().includes(searchLower) || false) ||
        (item.condition?.toLowerCase().includes(searchLower) || false) ||
        (item.appraisal?.details?.toLowerCase().includes(searchLower) || false)
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
    if (item && item._id) {
      this.router.navigate(['/showcase/item', item._id]);
    }
  }

  goBack(): void {
    // If we're in admin view, go back to admin user management
    if (this.isAdmin) {
      this.router.navigate(['/admin'], { queryParams: { selectedSection: 'users' } });
    } else {
      // Otherwise go back to the main showcase
      this.router.navigate(['/showcase']);
    }
  }

  filterItems() {
    if (!this.searchText) {
      this.filteredItems = [...this.items];
      return;
    }
    
    const searchLower = this.searchText.toLowerCase();
    this.filteredItems = this.items.filter(item => {
      return (
        (item.name && item.name.toLowerCase().includes(searchLower)) ||
        (item.category && item.category.toLowerCase().includes(searchLower)) ||
        (item.condition && item.condition.toLowerCase().includes(searchLower)) ||
        (item.appraisal && item.appraisal.details && item.appraisal.details.toLowerCase().includes(searchLower))
      );
    });
  }

  refreshItems(): void {
    // Clear the cache first
    if (this.showcaseService['clearCache']) {
      this.showcaseService['clearCache']();
    }
    
    // Then reload
    this.loadItems();
  }
} 