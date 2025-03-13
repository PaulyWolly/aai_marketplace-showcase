import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketplaceService } from '../../services/marketplace.service';
import { Appraisal } from '../../../appraisal/services/appraisal.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Import marked directly - this approach works better with different versions
declare const marked: any;

// Make sure marked is available globally
// This ensures it's loaded before we try to use it
(window as any).marked = (window as any).marked || {
  parse: (text: string) => text,
  marked: (text: string) => text
};

interface ItemWithOwner extends Appraisal {
  owner?: {
    name: string;
    email: string;
  };
  images?: string[];
}

@Component({
  selector: 'app-item-detail',
  templateUrl: './item-detail.component.html',
  styleUrls: ['./item-detail.component.scss']
})
export class ItemDetailComponent implements OnInit {
  item: ItemWithOwner | null = null;
  loading = false;
  error: string | null = null;
  currentImageIndex = 0;
  allImages: string[] = [];
  ownerLoading = false;
  renderedDetails: SafeHtml | null = null;
  renderedMarketResearch: SafeHtml | null = null;
  
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  constructor(
    public route: ActivatedRoute,
    private router: Router,
    private marketplaceService: MarketplaceService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadItem();
  }

  async loadItem(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Item ID is missing';
      return;
    }

    console.log('Loading item with ID:', id);
    
    try {
      this.loading = true;
      this.error = null;
      
      const item = await this.marketplaceService.getItemById(id);
      console.log('Item loaded:', item);
      
      if (item) {
        this.item = item;
        
        // Ensure we have basic data even if some fields are missing
        if (!this.item.name) this.item.name = 'Unnamed Item';
        if (!this.item.category) this.item.category = 'Uncategorized';
        if (!this.item.condition) this.item.condition = 'Unknown';
        if (!this.item.estimatedValue) this.item.estimatedValue = 'Not Appraised';
        
        // Initialize appraisal object if it doesn't exist
        if (!this.item.appraisal) {
          this.item.appraisal = {
            details: 'No details available',
            marketResearch: 'No market research available'
          };
        }
        
        this.setupImageGallery();
        this.renderMarkdown();
        
        // Load the owner's information
        if (item.userId) {
          this.loadOwnerInfo(item.userId);
        }
      } else {
        this.error = 'Item not found';
        console.error('Item not found for ID:', id);
      }
    } catch (err) {
      console.error('Error loading item details:', err);
      this.error = 'Failed to load item details';
    } finally {
      this.loading = false;
    }
  }
  
  loadOwnerInfo(userId: string): void {
    this.ownerLoading = true;
    
    this.authService.getBasicUserInfo(userId).subscribe({
      next: (user) => {
        if (this.item && user) {
          this.item.owner = {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          };
          console.log('Owner info loaded:', this.item.owner);
        } else {
          console.warn('Failed to load owner info - user data missing');
        }
        this.ownerLoading = false;
      },
      error: (err) => {
        console.error('Error loading owner info:', err);
        this.ownerLoading = false;
      }
    });
  }

  contactOwner(): void {
    if (!this.item?.owner?.email) {
      this.snackBar.open('Owner contact information is not available', 'Close', { duration: 3000 });
      return;
    }
    
    // Create a mailto link
    const subject = encodeURIComponent(`Inquiry about ${this.item.name}`);
    const body = encodeURIComponent(`Hello,\n\nI'm interested in your item "${this.item.name}" that I saw on the marketplace.\n\nCould you please provide more information?\n\nThank you.`);
    const mailtoLink = `mailto:${this.item.owner.email}?subject=${subject}&body=${body}`;
    
    // Open the user's email client
    window.location.href = mailtoLink;
  }

  setupImageGallery(): void {
    console.log('Setting up image gallery for item:', this.item);
    
    if (!this.item) {
      console.warn('No item available for image gallery setup');
      return;
    }
    
    try {
      this.allImages = [];
      
      // Add the main image
      if (this.item.imageUrl) {
        console.log('Adding main image:', this.item.imageUrl);
        this.allImages.push(this.item.imageUrl);
      }
      
      // Add additional images if available
      if (this.item.images && Array.isArray(this.item.images)) {
        console.log('Adding additional images:', this.item.images);
        this.allImages = [...this.allImages, ...this.item.images];
      }
      
      // Reset the current image index
      this.currentImageIndex = 0;
      
      console.log('Image gallery setup complete. Total images:', this.allImages.length);
    } catch (error) {
      console.error('Error setting up image gallery:', error);
    }
  }
  
  get currentImage(): string {
    return this.allImages[this.currentImageIndex] || '';
  }
  
  selectImage(index: number): void {
    if (index >= 0 && index < this.allImages.length) {
      this.currentImageIndex = index;
    }
  }
  
  nextImage(): void {
    if (this.currentImageIndex < this.allImages.length - 1) {
      this.currentImageIndex++;
    } else {
      this.currentImageIndex = 0; // Loop back to the first image
    }
  }
  
  previousImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    } else {
      this.currentImageIndex = this.allImages.length - 1; // Loop to the last image
    }
  }

  goBack(): void {
    this.router.navigate(['/marketplace']);
  }

  renderMarkdown(): void {
    console.log('Rendering markdown for item:', this.item);
    
    if (this.item) {
      try {
        // Simple fallback text if markdown rendering fails
        let detailsHtml = '<p>No details available</p>';
        let marketResearchHtml = '<p>No market research available</p>';
        
        if (this.item.appraisal?.details) {
          try {
            // Try multiple approaches to render markdown
            if (typeof marked === 'function') {
              // marked is a function in some versions
              detailsHtml = marked(this.item.appraisal.details);
            } else if (marked.parse) {
              // marked.parse exists in some versions
              detailsHtml = marked.parse(this.item.appraisal.details);
            } else if (marked.marked) {
              // marked.marked exists in some versions
              detailsHtml = marked.marked(this.item.appraisal.details);
            } else {
              // Fallback to simple HTML
              detailsHtml = this.item.appraisal.details
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/#{3}(.*?)\n/g, '<h3>$1</h3>')
                .replace(/#{2}(.*?)\n/g, '<h2>$1</h2>')
                .replace(/#{1}(.*?)\n/g, '<h1>$1</h1>');
            }
          } catch (e) {
            console.error('Error rendering details markdown:', e);
            // Fallback to simple HTML conversion
            detailsHtml = this.item.appraisal.details
              .replace(/\n/g, '<br>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>');
          }
        }
        
        if (this.item.appraisal?.marketResearch) {
          try {
            // Try multiple approaches to render markdown
            if (typeof marked === 'function') {
              // marked is a function in some versions
              marketResearchHtml = marked(this.item.appraisal.marketResearch);
            } else if (marked.parse) {
              // marked.parse exists in some versions
              marketResearchHtml = marked.parse(this.item.appraisal.marketResearch);
            } else if (marked.marked) {
              // marked.marked exists in some versions
              marketResearchHtml = marked.marked(this.item.appraisal.marketResearch);
            } else {
              // Fallback to simple HTML
              marketResearchHtml = this.item.appraisal.marketResearch
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/#{3}(.*?)\n/g, '<h3>$1</h3>')
                .replace(/#{2}(.*?)\n/g, '<h2>$1</h2>')
                .replace(/#{1}(.*?)\n/g, '<h1>$1</h1>');
            }
          } catch (e) {
            console.error('Error rendering market research markdown:', e);
            // Fallback to simple HTML conversion
            marketResearchHtml = this.item.appraisal.marketResearch
              .replace(/\n/g, '<br>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>');
          }
        }
        
        this.renderedDetails = this.sanitizer.bypassSecurityTrustHtml(detailsHtml);
        this.renderedMarketResearch = this.sanitizer.bypassSecurityTrustHtml(marketResearchHtml);
        
      } catch (error) {
        console.error('Error in renderMarkdown method:', error);
        // Provide fallback content if rendering fails
        this.renderedDetails = this.sanitizer.bypassSecurityTrustHtml('<p>Error rendering content</p>');
        this.renderedMarketResearch = this.sanitizer.bypassSecurityTrustHtml('<p>Error rendering content</p>');
      }
    } else {
      console.warn('No item to render markdown for');
    }
  }
  
  editAsAdmin(id: string): void {
    this.router.navigate(['/admin/items/edit', id]);
  }
  
  handleImageError(event: Event): void {
    console.error('Image failed to load:', event);
    const imgElement = event.target as HTMLImageElement;
    // Use a simple data URL for a placeholder image (gray square with text)
    imgElement.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%23CCCCCC%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23333333%22%3EImage%20Not%20Available%3C%2Ftext%3E%3C%2Fsvg%3E';
  }
} 