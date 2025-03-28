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
import { ReassignItemDialogComponent } from '../reassign-item-dialog/reassign-item-dialog.component';

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
  isOwner = false;
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
    this.checkOwnerStatus();
  }

  private checkAdminStatus(): void {
    this.authService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
  }

  private checkOwnerStatus(): void {
    // Get the current user
    const currentUser = this.authService.getCurrentUser();
    
    // Check if user is logged in and matches the item owner
    if (currentUser && this.item && this.item.userId) {
      // Check if the current user is the owner of this item
      this.isOwner = currentUser._id === this.item.userId;
      console.log('Current user is owner:', this.isOwner);
    } else {
      this.isOwner = false;
    }
  }

  async loadItem(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        this.error = 'Item ID not found';
        this.loading = false;
        return;
      }
      
      console.log('Loading item with ID:', id);
      const item = await this.showcaseService.getItemById(id);
      
      if (item) {
        this.item = item;
        console.log('Item loaded successfully:', this.item);
        
        // Log information about images
        console.log('Main imageUrl:', this.item?.imageUrl);
        console.log('Additional images array:', this.item?.images);
        
        // Set up the image gallery
        this.setupImageGallery();
        
        // Log the allImages array after setup 
        console.log('All images after setup:', this.allImages);
        
        // Check if the main image is actually an array (which can cause errors)
        if (this.item && Array.isArray(this.item.imageUrl)) {
          console.warn('imageUrl is an array - fixing by using the first element');
          this.item.imageUrl = this.item.imageUrl.length > 0 ? this.item.imageUrl[0] : '';
        }
        
        // Render markdown for appraisal details
        this.renderMarkdown();
        
        // For member-uploaded items, try to load member info
        if (this.item?.userId) {
          this.loadMemberInfo(this.item.userId);
        }
        
        // Check if current user is the owner
        this.checkOwnerStatus();
      } else {
        this.error = 'Item not found';
      }
    } catch (err) {
      console.error('Error loading item:', err);
      this.error = 'Failed to load item details';
      if (err instanceof Error) {
        this.error += `: ${err.message}`;
      }
    } finally {
      this.loading = false;
    }
  }
  
  loadMemberInfo(userId?: string): Promise<void> {
    if (!userId) {
      if (!this.item || !this.item.userId) return Promise.resolve();
      userId = this.item.userId;
    }
    
    this.memberLoading = true;
    return new Promise((resolve) => {
      this.authService.getBasicUserInfo(userId!).subscribe({
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
          resolve();
        },
        error: (err) => {
          console.error('Error loading member info:', err);
          this.memberLoading = false;
          resolve(); // Resolve even on error to continue the flow
        }
      });
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
    console.log('====== SETTING UP IMAGE GALLERY ======');
    
    if (!this.item) {
      console.warn('No item available for image gallery setup');
      this.allImages = ['assets/images/placeholder.jpg'];
      this.currentImageIndex = 0;
      return;
    }
    
    try {
      // Initialize empty array for all images and set for tracking duplicates
      this.allImages = [];
      const seenUrls = new Set<string>();
      
      // First add the main image if it exists
      if (this.item.imageUrl && typeof this.item.imageUrl === 'string' && this.item.imageUrl.trim() !== '') {
        console.log('Adding main imageUrl to gallery:', this.item.imageUrl);
        this.allImages.push(this.item.imageUrl);
        seenUrls.add(this.item.imageUrl);
      } else if (Array.isArray(this.item.imageUrl)) {
        // Handle case where imageUrl is incorrectly an array
        console.warn('Main imageUrl is incorrectly an array - fixing by using first element');
        const firstImage = this.item.imageUrl.length > 0 ? this.item.imageUrl[0] : '';
        if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
          this.allImages.push(firstImage);
          seenUrls.add(firstImage);
          this.item.imageUrl = firstImage; // Update the item's imageUrl
        }
      }
      
      // Then add all images from the images array, skipping duplicates
      if (this.item.images && Array.isArray(this.item.images)) {
        console.log('Processing additional images array, length:', this.item.images.length);
        
        this.item.images.forEach((imgUrl, index) => {
          // Skip empty/null images
          if (!imgUrl || typeof imgUrl !== 'string' || imgUrl.trim() === '') {
            console.log(`Skipping empty image at index ${index}`);
            return;
          }
          
          // Skip duplicates by checking against the seen URLs set
          if (seenUrls.has(imgUrl)) {
            console.log(`Skipping duplicate image at index ${index}: ${imgUrl}`);
            return;
          }
          
          // Add image to gallery and track it
          this.allImages.push(imgUrl);
          seenUrls.add(imgUrl);
          console.log(`Added image from array at index ${index}: ${imgUrl}`);
        });
      } else {
        console.log('No additional images array found or it is not an array');
      }
      
      // Add a placeholder if no images were found
      if (this.allImages.length === 0) {
        console.log('No images found, adding placeholder');
        this.allImages.push('assets/images/placeholder.jpg');
      }
      
      // Reset current image index
      this.currentImageIndex = 0;
      
      // Log final gallery setup
      console.log('Final image gallery contains', this.allImages.length, 'images:');
      this.allImages.forEach((img, i) => console.log(`[${i}] ${img}`));
    } catch (error) {
      console.error('Error setting up image gallery:', error);
      // Fallback to placeholder
      this.allImages = ['assets/images/placeholder.jpg'];
      this.currentImageIndex = 0;
    }
  }
  
  get currentImage(): string {
    if (!this.allImages || this.allImages.length === 0) {
      return 'assets/images/placeholder.jpg';
    }
    return this.allImages[this.currentImageIndex];
  }
  
  selectImage(index: number): void {
    if (index >= 0 && index < this.allImages.length) {
      this.currentImageIndex = index;
      console.log(`Selected image at index ${index}:`, this.allImages[index]);
    }
  }
  
  makeMainImage(index: number): void {
    if (!this.item || index < 0 || index >= this.allImages.length) {
      return;
    }
    
    const newMainImageUrl = this.allImages[index];
    console.log(`Setting image at index ${index} as main image:`, newMainImageUrl);
    
    // Update the imageUrl in the item object
    this.item.imageUrl = newMainImageUrl;
    
    // Make sure allImages is updated if needed
    if (this.currentImageIndex !== index) {
      this.selectImage(index);
    }
    
    // Show feedback to user
    this.snackBar.open('Main image updated', 'Close', { duration: 2000 });
    
    // Save the changes to the server
    this.saveItemChanges();
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
  
  reassignItem(item: any): void {
    if (!item || !item._id) {
      this.snackBar.open('Cannot reassign: Item ID is missing', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ReassignItemDialogComponent, {
      width: '500px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Show a loading message
        this.snackBar.open('Reassignment successful, refreshing page...', '', { duration: 2000 });
        
        // Refresh the entire page after a short delay to allow the snackbar to be seen
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });
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

  // Save item changes to the server
  saveItemChanges(): void {
    if (!this.item || !this.item._id) {
      this.snackBar.open('Failed to save: Item ID is missing', 'Close', { duration: 3000 });
      return;
    }

    // Check if user has permission to edit (admin or owner)
    if (!this.isAdmin && !this.isOwner) {
      this.snackBar.open('You do not have permission to update this item', 'Close', { duration: 3000 });
      return;
    }

    // Show loading indicator
    const loadingSnackBarRef = this.snackBar.open('Saving changes...', '', { duration: 0 });
    
    // Create a complete copy of the item for saving
    // This ensures we preserve all fields, not just images
    const updatedItem = {
      ...this.item,
      _id: this.item._id,
      imageUrl: this.item.imageUrl || '',
      images: [...this.allImages],
      
      // Ensure appraisal data is included
      appraisal: {
        ...(this.item.appraisal || {}),
        details: this.item.appraisal?.details || '',
        marketResearch: this.item.appraisal?.marketResearch || ''
      },
      
      // Include other important fields explicitly
      name: this.item.name || '',
      category: this.item.category || '',
      condition: this.item.condition || '',
      estimatedValue: this.item.estimatedValue || '',
      height: this.item.height || '',
      width: this.item.width || '',
      weight: this.item.weight || ''
    };
    
    console.log('Saving updated item:');
    console.log('- Main imageUrl:', updatedItem.imageUrl);
    console.log('- Images array:', updatedItem.images);
    console.log('- Appraisal details:', updatedItem.appraisal.details ? 'Present' : 'Missing');
    console.log('- Appraisal market research:', updatedItem.appraisal.marketResearch ? 'Present' : 'Missing');
    
    // Save to server using the AppraisalService
    this.appraisalService.saveAppraisal(updatedItem)
      .then((response) => {
        loadingSnackBarRef.dismiss();
        this.snackBar.open('Changes saved successfully', 'Close', { duration: 3000 });
        
        // Clear the showcase cache for this item 
        if (this.item && this.item._id) {
          console.log('Clearing showcase cache for item:', this.item._id);
          this.showcaseService.clearCacheForItem(this.item._id);
        }
        
        // Reload the item to ensure we have the latest data
        this.loadItem();
        
        // Log successful save
        console.log('Item successfully updated:', response);
      })
      .catch((error: Error) => {
        loadingSnackBarRef.dismiss();
        console.error('Error saving item changes:', error);
        this.snackBar.open('Failed to save changes. Please try again.', 'Close', { duration: 5000 });
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

  // Add a method to reload the current item data
  refreshItem(): void {
    // Get the item ID from the route params
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      // Show loading indicator
      this.loading = true;
      this.error = null;
      
      // Clear the item from cache
      if (this.showcaseService['clearCacheForItem']) {
        console.log('Clearing cache for item:', id);
        this.showcaseService['clearCacheForItem'](id);
      }
      
      // Reset the images array
      this.allImages = [];
      this.currentImageIndex = 0;
      
      // Display a snackbar message
      this.snackBar.open('Refreshing item data...', '', { duration: 2000 });
      
      // Reload the item
      this.loadItem();
    }
  }

  /**
   * Refreshes just the image gallery without reloading the entire item
   * Useful after adding/removing/changing images
   */
  refreshImageGallery(): void {
    if (!this.item) return;
    
    // Save current image index if possible
    const currentImage = this.allImages[this.currentImageIndex];
    
    // Rebuild the image gallery
    this.setupImageGallery();
    
    // Try to restore the previous image selection
    if (currentImage && this.allImages.includes(currentImage)) {
      this.currentImageIndex = this.allImages.indexOf(currentImage);
    }
    
    // Show confirmation to user
    this.snackBar.open('Image gallery refreshed', 'Close', { duration: 2000 });
  }

  /**
   * Shows the image at the specified index
   * @param index The index of the image to show
   */
  showImage(index: number): void {
    if (this.allImages && index >= 0 && index < this.allImages.length) {
      this.currentImageIndex = index;
      console.log(`Showing image at index ${index}: ${this.allImages[index]}`);
    }
  }
  
  /**
   * Handle double-click on an image to set it as the main image
   * @param index Index of the image in the gallery
   */
  onImageDoubleClick(index: number): void {
    this.makeMainImage(index);
  }

  /**
   * Alias for makeMainImage to use a more descriptive name
   * @param index Index of the image in the gallery to set as main
   */
  selectAsMainImage(index: number): void {
    this.makeMainImage(index);
  }

  /**
   * Alias for previousImage to provide consistent naming
   */
  prevImage(): void {
    this.previousImage();
  }
} 