import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShowcaseService } from '../../services/showcase.service';
import { Appraisal, AppraisalService } from '../../../appraisal/services/appraisal.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { finalize } from 'rxjs/operators';

// Import marked directly - this approach works better with different versions
declare const marked: any;

// Make sure marked is available globally
// This ensures it's loaded before we try to use it
(window as any).marked = (window as any).marked || {
  parse: (text: string) => text,
  marked: (text: string) => text
};

interface ItemWithMember extends Appraisal {
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
  item: ItemWithMember | null = null;
  loading = false;
  error: string | null = null;
  currentImageIndex = 0;
  allImages: string[] = [];
  memberLoading = false;
  renderedDetails: SafeHtml | null = null;
  renderedMarketResearch: SafeHtml | null = null;
  isAdmin = false;
  isDeleting = false;
  
  constructor(
    public route: ActivatedRoute,
    private router: Router,
    private showcaseService: ShowcaseService,
    private appraisalService: AppraisalService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadItem();
    this.checkAdminStatus();
  }

  private checkAdminStatus(): void {
    this.authService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
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
      
      // Add a timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
      });
      
      // Race the item loading against the timeout
      const item = await Promise.race([
        this.showcaseService.getItemById(id),
        timeoutPromise
      ]);
      
      console.log('Item loaded:', item);
      
      if (item) {
        this.item = item;
        
        // Ensure we have basic data even if some fields are missing
        if (!this.item?.name) this.item!.name = 'Unnamed Item';
        if (!this.item?.category) this.item!.category = 'Uncategorized';
        if (!this.item?.condition) this.item!.condition = 'Unknown';
        if (!this.item?.estimatedValue) this.item!.estimatedValue = 'Not Appraised';
        
        // Initialize appraisal object if it doesn't exist
        if (!this.item!.appraisal) {
          this.item!.appraisal = {
            details: 'No details available',
            marketResearch: 'No market research available'
          };
        } else {
          // Ensure appraisal fields exist
          if (!this.item!.appraisal.details) {
            this.item!.appraisal.details = 'No details available';
          }
          if (!this.item!.appraisal.marketResearch) {
            this.item!.appraisal.marketResearch = 'No market research available';
          }
        }
        
        this.setupImageGallery();
        this.renderMarkdown();
        
        // Load the member's information
        this.loadMemberInfo();
      } else {
        this.error = 'Item not found';
        console.error('Item not found for ID:', id);
      }
    } catch (err) {
      console.error('Error loading item details:', err);
      if (err instanceof Error) {
        this.error = err.message || 'Failed to load item details';
      } else {
        this.error = 'Failed to load item details';
      }
    } finally {
      this.loading = false;
    }
  }
  
  loadMemberInfo(userId?: string): void {
    if (!userId) {
      if (!this.item || !this.item.userId) return;
      userId = this.item.userId;
    }
    
    this.memberLoading = true;
    this.authService.getBasicUserInfo(userId).subscribe({
      next: (user) => {
        if (this.item && user) {
          this.item.owner = {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          };
          console.log('Member info loaded:', this.item.owner);
        } else {
          console.warn('Failed to load member info - user data missing');
        }
        this.memberLoading = false;
      },
      error: (err) => {
        console.error('Error loading member info:', err);
        this.memberLoading = false;
      }
    });
  }

  contactMember(): void {
    if (!this.item?.owner?.email) {
      this.snackBar.open('Member contact information is not available', 'Close', { duration: 3000 });
      return;
    }
    
    // Create a mailto link
    const subject = encodeURIComponent(`Inquiry about ${this.item.name}`);
    const body = encodeURIComponent(`Hello,\n\nI'm interested in your item "${this.item.name}" that I saw on the showcase.\n\nCould you please provide more information?\n\nThank you.`);
    const mailtoLink = `mailto:${this.item.owner.email}?subject=${subject}&body=${body}`;
    
    // Open the user's email client
    window.location.href = mailtoLink;
  }

  setupImageGallery(): void {
    console.log('Setting up image gallery for item:', this.item);
    
    if (!this.item) {
      console.warn('No item available for image gallery setup');
      this.allImages = ['assets/images/placeholder.jpg'];
      this.currentImageIndex = 0;
      return;
    }
    
    try {
      this.allImages = [];
      
      // Add the main image
      if (this.item.imageUrl) {
        console.log('Adding main image:', this.item.imageUrl);
        this.allImages.push(this.item.imageUrl);
      }
      
      // Add additional images if available, but avoid duplicates
      if (this.item.images && Array.isArray(this.item.images)) {
        console.log('Processing additional images:', this.item.images);
        
        // Filter out duplicates and null/undefined values
        const additionalImages = this.item.images.filter(img => 
          img && // Filter out null/undefined
          img !== this.item?.imageUrl && // Filter out main image
          !this.allImages.includes(img) // Filter out any duplicates already in allImages
        );
        
        console.log('Filtered additional images:', additionalImages);
        this.allImages = [...this.allImages, ...additionalImages];
      }
      
      // If no images were found, add a placeholder
      if (this.allImages.length === 0) {
        console.log('No images found, adding placeholder');
        this.allImages.push('assets/images/placeholder.jpg');
      }
      
      // Reset the current image index
      this.currentImageIndex = 0;
      
      console.log('Image gallery setup complete. Total images:', this.allImages.length);
    } catch (error) {
      console.error('Error setting up image gallery:', error);
      // Add a placeholder image in case of error
      this.allImages = ['assets/images/placeholder.jpg'];
      this.currentImageIndex = 0;
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
    this.router.navigate(['/showcase']);
  }

  renderMarkdown(): void {
    console.log('Rendering markdown for item:', this.item);
    
    if (!this.item) {
      console.warn('No item to render markdown for');
      this.renderedDetails = this.sanitizer.bypassSecurityTrustHtml('<p>No details available</p>');
      this.renderedMarketResearch = this.sanitizer.bypassSecurityTrustHtml('<p>No market research available</p>');
      return;
    }

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
  }
  
  editAsAdmin(id: string): void {
    if (!id) {
      this.snackBar.open('Cannot edit: Item ID is missing', 'Close', { duration: 3000 });
      return;
    }
    this.router.navigate(['/admin/items/edit', id]);
  }
  
  handleImageError(event: Event): void {
    console.error('Image failed to load:', event);
    const imgElement = event.target as HTMLImageElement;
    // Use a simple data URL for a placeholder image (gray square with text)
    imgElement.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%23CCCCCC%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23333333%22%3EImage%20Not%20Available%3C%2Ftext%3E%3C%2Fsvg%3E';
  }

  deleteImage(index: number): void {
    if (index < 0 || index >= this.allImages.length || !this.item) {
      return;
    }
    
    const imageToRemove = this.allImages[index];
    
    // Open confirmation dialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Delete Image',
        message: 'Are you sure you want to delete this image? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.item) {
        // Remove the image from the allImages array
        this.allImages.splice(index, 1);
        
        // If we're deleting the current image, adjust the current index
        if (index === this.currentImageIndex) {
          // If it's the last image, go to the previous one
          if (index === this.allImages.length) {
            this.currentImageIndex = Math.max(0, this.allImages.length - 1);
          }
          // Otherwise stay at the same index (which now shows the next image)
        } 
        // If we're deleting an image before the current one, adjust the current index
        else if (index < this.currentImageIndex) {
          this.currentImageIndex = Math.max(0, this.currentImageIndex - 1);
        }
        
        // If the image we're removing is the main image, update the item's imageUrl
        if (this.item.imageUrl === imageToRemove) {
          // Set the first available image as the main image, or empty string if none left
          this.item.imageUrl = this.allImages.length > 0 ? this.allImages[0] : '';
        }
        
        // Also remove from the item's images array if it exists there
        if (this.item.images && Array.isArray(this.item.images)) {
          const imgIndex = this.item.images.indexOf(imageToRemove);
          if (imgIndex !== -1) {
            this.item.images.splice(imgIndex, 1);
          }
        }
        
        // Save the updated item to the server
        this.saveItemChanges();
      }
    });
  }

  // New method to save item changes to the server
  private saveItemChanges(): void {
    if (!this.item || !this.item._id) {
      this.snackBar.open('Failed to save changes: Item ID is missing', 'Close', { duration: 3000 });
      return;
    }

    // Show loading indicator
    const loadingSnackBarRef = this.snackBar.open('Saving changes...', '', { duration: 0 });
    
    // Create a copy of the item with the updated images
    const updatedItem = {
      ...this.item,
      imageUrl: this.item.imageUrl || '',
      images: this.allImages.filter(img => img !== this.item?.imageUrl)
    };
    
    // Save to server using the AppraisalService
    this.appraisalService.saveAppraisal(updatedItem)
      .then(() => {
        loadingSnackBarRef.dismiss();
        this.snackBar.open('Image removed successfully', 'Close', { duration: 3000 });
      })
      .catch((error: Error) => {
        loadingSnackBarRef.dismiss();
        console.error('Error saving item changes:', error);
        this.snackBar.open('Failed to save changes. The image will reappear on refresh.', 'Close', { duration: 5000 });
      });
  }

  deleteItem(): void {
    if (!this.item || !this.item._id) {
      this.snackBar.open('Cannot delete: Item ID is missing', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isDeleting = true;
        this.showcaseService.deleteItem(this.item!._id!)
          .pipe(
            finalize(() => this.isDeleting = false)
          )
          .subscribe({
            next: () => {
              this.snackBar.open('Item deleted successfully', 'Close', {
                duration: 3000
              });
              this.router.navigate(['/showcase']);
            },
            error: (error) => {
              console.error('Error deleting item:', error);
              this.snackBar.open('Failed to delete item. Please try again.', 'Close', {
                duration: 3000
              });
            }
          });
      }
    });
  }
} 