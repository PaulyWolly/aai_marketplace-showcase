import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImageUploadService } from '../../services/image-upload.service';

@Component({
  selector: 'app-image-gallery',
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss']
})
export class ImageGalleryComponent implements OnInit, OnChanges {
  @Input() images: FormArray = this.fb.array([]);
  @Input() mainImageUrl: string = '';
  @Input() readOnly: boolean = false;
  
  @Output() mainImageChange = new EventEmitter<string>();
  @Output() imagesChange = new EventEmitter<FormArray>();
  
  isUploading: boolean = false;
  
  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private imageUploadService: ImageUploadService
  ) {}
  
  ngOnInit(): void {
    // Initialize component
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // React to input changes
    if (changes['images'] && this.images) {
      // Handle images array changes
    }
  }
  
  /**
   * Helper method to check if an image is the main one
   */
  isMainImage(imageGroup: any): boolean {
    if (imageGroup && imageGroup instanceof FormGroup) {
      return imageGroup.get('isMain')?.value === true;
    }
    return false;
  }
  
  /**
   * Helper method to extract the URL from a form group in the images array
   */
  getImageUrl(imageGroup: any): string {
    if (imageGroup && imageGroup instanceof FormGroup) {
      return imageGroup.get('url')?.value || '';
    }
    return '';
  }
  
  validateImage(file: File): boolean {
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSizeInBytes) {
      this.snackBar.open('Image is too large. Maximum size is 5MB.', 'Close', { duration: 3000 });
      return false;
    }
    
    if (!validTypes.includes(file.type)) {
      this.snackBar.open('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.', 'Close', { duration: 3000 });
      return false;
    }
    
    return true;
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (this.validateImage(file)) {
        this.isUploading = true;
        
        this.imageUploadService.processImage(file)
          .then((imageData: string) => {
            this.addImage(imageData);
            this.isUploading = false;
          })
          .catch((error: Error) => {
            this.snackBar.open(`Failed to process image: ${error.message}`, 'Close', { duration: 3000 });
            this.isUploading = false;
          });
      }
    }
  }
  
  addImage(imageData: string): void {
    const newImageGroup = this.fb.group({
      url: [imageData],
      isMain: [false]
    });
    
    this.images.push(newImageGroup);
    this.imagesChange.emit(this.images);
    
    // If this is the first image, set it as main
    if (this.images.length === 1) {
      this.setMainImage(0);
    }
    
    this.snackBar.open('Image added successfully', 'Close', { duration: 2000 });
  }
  
  setMainImage(index: number): void {
    // Reset all isMain flags
    this.images.controls.forEach((control, i) => {
      const formGroup = control as FormGroup;
      formGroup.get('isMain')?.setValue(i === index);
    });
    
    // Get the URL of the new main image
    const mainImageControl = this.images.at(index) as FormGroup;
    const newMainUrl = mainImageControl.get('url')?.value;
    
    // Update main image URL and emit change
    this.mainImageUrl = newMainUrl;
    this.mainImageChange.emit(this.mainImageUrl);
  }
  
  removeImage(index: number): void {
    // Check if the image being removed is the main image
    const imageControl = this.images.at(index) as FormGroup;
    const isMain = imageControl.get('isMain')?.value;
    
    // Remove the image from the array
    this.images.removeAt(index);
    this.imagesChange.emit(this.images);
    
    // If we removed the main image and there are other images, set a new main image
    if (isMain && this.images.length > 0) {
      this.setMainImage(0);
    } else if (this.images.length === 0) {
      // If no images left, clear main image
      this.mainImageUrl = '';
      this.mainImageChange.emit('');
    }
    
    this.snackBar.open('Image removed', 'Close', { duration: 2000 });
  }
  
  rotateImage(index: number): void {
    try {
      // Get the current image
      const imageControl = this.images.at(index) as FormGroup;
      const currentUrl = imageControl.get('url')?.value;
      
      // Rotate the image using the service
      this.imageUploadService.rotateImage(currentUrl)
        .then((rotatedImageData: string) => {
          // Update the image URL
          imageControl.get('url')?.setValue(rotatedImageData);
          
          // If this is the main image, update the main image URL
          if (imageControl.get('isMain')?.value) {
            this.mainImageUrl = rotatedImageData;
            this.mainImageChange.emit(this.mainImageUrl);
          }
          
          this.snackBar.open('Image rotated', 'Close', { duration: 2000 });
        })
        .catch((error: Error) => {
          this.snackBar.open(`Failed to rotate image: ${error.message}`, 'Close', { duration: 3000 });
        });
    } catch (error: any) {
      this.snackBar.open(`An error occurred: ${error.message}`, 'Close', { duration: 3000 });
    }
  }
  
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.png'; // Fallback image
    this.snackBar.open('Failed to load image. It may have CORS or security restrictions.', 'Close', { duration: 3000 });
  }
} 