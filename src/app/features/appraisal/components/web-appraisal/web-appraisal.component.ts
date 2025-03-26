import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import { Subject, Observable, interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { WebAppraisalService, WebAppraisalRequest, WebAppraisalResult } from '../../services/web-appraisal.service';
import { AppraisalService } from '../../services/appraisal.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { ImageCaptureDialogComponent } from '../../../../shared/components/image-capture-dialog/image-capture-dialog.component';

@Component({
  selector: 'app-web-appraisal',
  templateUrl: './web-appraisal.component.html',
  styleUrls: ['./web-appraisal.component.scss']
})
export class WebAppraisalComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  // Webcam properties
  private trigger: Subject<void> = new Subject<void>();
  public webcamImage: WebcamImage | null = null;
  public showWebcam = false;
  public isCameraActive = false;
  public selectedDevice: string | undefined;
  public devices: MediaDeviceInfo[] = [];
  public isScanning = false;
  
  // Form properties
  appraisalForm: FormGroup;
  categories: string[];
  conditions: string[];
  
  // Appraisal process properties
  imageData: string | undefined;
  isSubmitting = false;
  currentAppraisal: WebAppraisalResult | null = null;
  appraisalError: string | null = null;
  processingStage: 'form' | 'processing' | 'results' = 'form';
  pollingSubscription: Subscription | null = null;
  processingProgress = 0;
  
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private webAppraisalService: WebAppraisalService,
    private appraisalService: AppraisalService,
    private categoriesService: CategoriesService,
    private snackBar: MatSnackBar
  ) {
    this.categories = this.categoriesService.categories;
    this.conditions = this.categoriesService.conditions;
    
    this.appraisalForm = this.fb.group({
      name: ['', [Validators.required]],
      category: ['', [Validators.required]],
      condition: ['', [Validators.required]],
      estimatedValue: ['', [Validators.required]],
      height: [''],
      width: [''],
      weight: [''],
      details: ['', [Validators.required]],
      marketResearch: [''],
      images: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Any initialization code
  }

  ngOnDestroy(): void {
    this.disconnectCamera();
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    this.trigger.complete();
  }
  
  // Camera handling methods
  private isMobileDevice(label: string): boolean {
    const mobileKeywords = ['front camera', 'back camera', 'rear camera', 'iphone', 'android', 'mobile', 'phone'];
    return mobileKeywords.some(keyword => label.toLowerCase().includes(keyword));
  }

  private isLaptopWebcam(label: string): boolean {
    const laptopKeywords = [
      'integrated',
      'built-in',
      'webcam',
      'hd camera',
      'laptop',
      'notebook',
      'internal'
    ];
    return laptopKeywords.some(keyword => label.toLowerCase().includes(keyword));
  }

  async scanForDevices() {
    this.isScanning = true;
    this.appraisalError = null;
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
      }

      // Request camera permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Sort devices to prioritize laptop webcams
      const sortedDevices = [...videoDevices].sort((a, b) => {
        const aIsLaptop = this.isLaptopWebcam(a.label);
        const bIsLaptop = this.isLaptopWebcam(b.label);
        if (aIsLaptop && !bIsLaptop) return -1;
        if (!aIsLaptop && bIsLaptop) return 1;
        return 0;
      });

      this.devices = sortedDevices;
      
      // Always try to select laptop webcam first
      const laptopWebcam = sortedDevices.find(device => this.isLaptopWebcam(device.label));
      
      if (laptopWebcam) {
        console.log('Selected laptop webcam:', laptopWebcam);
        this.selectedDevice = laptopWebcam.deviceId;
      } else {
        console.log('No laptop webcam found, using first available camera:', sortedDevices[0]);
        this.selectedDevice = sortedDevices[0].deviceId;
      }
      
    } catch (err: any) {
      console.error('Error scanning for cameras:', err);
      this.appraisalError = `Failed to scan for cameras: ${err.message}`;
    } finally {
      this.isScanning = false;
    }
  }

  async connectCamera() {
    if (!this.selectedDevice) {
      this.appraisalError = 'Please select a camera device first';
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: this.selectedDevice },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.showWebcam = true;
      this.isCameraActive = true;
      this.appraisalError = null;
    } catch (err: any) {
      console.error('Error connecting to camera:', err);
      this.appraisalError = `Failed to connect to camera: ${err.message}`;
      this.showWebcam = false;
      this.isCameraActive = false;
    }
  }

  disconnectCamera() {
    this.showWebcam = false;
    this.isCameraActive = false;
  }

  public triggerSnapshot(): void {
    this.trigger.next();
  }

  public handleImage(webcamImage: WebcamImage): void {
    console.log('Received webcam image');
    this.webcamImage = webcamImage;
    this.imageData = webcamImage.imageAsDataUrl;
    this.disconnectCamera();
    
    // Add the image to the form
    const images = this.appraisalForm.get('images') as FormArray;
    images.push(this.fb.control(this.imageData));
    this.appraisalForm.patchValue({
      imageUrl: this.imageData
    });
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public handleInitError(error: WebcamInitError): void {
    console.error('Error initializing webcam:', error);
    let errorMessage = 'Could not initialize webcam: ';
    
    if (error.mediaStreamError && error.mediaStreamError.name === 'NotAllowedError') {
      errorMessage += 'Camera access was denied. Please enable camera permissions in your browser settings.';
    } else if (error.mediaStreamError && error.mediaStreamError.name === 'NotFoundError') {
      errorMessage += 'No camera signal detected. Please check if your camera is properly connected.';
    } else if (error.mediaStreamError && error.mediaStreamError.name === 'NotReadableError') {
      errorMessage += 'Cannot read camera. It may be in use by another application.';
    } else {
      errorMessage += error.message || 'Unknown error occurred';
    }
    
    this.appraisalError = errorMessage;
    this.showWebcam = false;
    this.isCameraActive = false;
  }

  // Getter for the images FormArray
  get images(): FormArray {
    return this.appraisalForm.get('images') as FormArray;
  }

  // Add an image to the FormArray
  addImage(imageUrl: string): void {
    this.images.push(this.fb.control(imageUrl));
  }

  // Remove an image from the FormArray
  removeImage(index: number): void {
    this.images.removeAt(index);
  }

  // Handle file selection
  onFileSelected(event: any): void {
    if (!event.target.files || !event.target.files.length) {
      return;
    }
    
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.addImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  // Open camera capture dialog
  openCameraCapture(): void {
    // Check if the device has camera capabilities
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.snackBar.open('Camera access not supported by your browser. Try using the upload option instead.', 'Close', { 
        duration: 5000 
      });
      return;
    }

    // Try to access the camera
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        // Get available cameras first to populate selection in dialog
        navigator.mediaDevices.enumerateDevices()
          .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const hasMultipleWebcams = videoDevices.length > 1;
            
            console.log(`Found ${videoDevices.length} video input devices`);
            
            // Open the dialog after permissions are granted
            const dialogRef = this.dialog.open(ImageCaptureDialogComponent, {
              width: '95%',
              maxWidth: '650px',
              height: 'auto',
              maxHeight: '90vh',
              disableClose: true,
              panelClass: ['camera-dialog', 'mat-dialog-no-scroll'],
              autoFocus: false,
              data: {
                multipleWebcams: hasMultipleWebcams,
                availableDevices: videoDevices
              }
            });

            dialogRef.afterClosed().subscribe(result => {
              if (!result) {
                console.log('Dialog was closed without any result');
                return;
              }
              
              if (result.error) {
                console.error('Error from camera dialog:', result.error);
                this.snackBar.open(`Camera error: ${result.error}`, 'Close', { duration: 3000 });
                return;
              }
              
              if (result.imageData) {
                console.log('Received image data from camera dialog');
                
                // Add the image to the form array
                const images = this.appraisalForm.get('images') as FormArray;
                images.push(this.fb.control(result.imageData));
                
                // Show success message
                this.snackBar.open('Photo captured successfully', 'Close', { duration: 3000 });
              }
            });
          })
          .catch(err => {
            console.error('Error enumerating devices:', err);
            this.snackBar.open('Could not access camera details. Please check camera permissions.', 'Close', { 
              duration: 5000 
            });
          });
      })
      .catch(err => {
        console.error('Camera permission error:', err);
        let errorMessage = 'Camera access denied. Please enable camera permissions in your browser settings.';
        
        // Provide more specific error messages based on the error
        if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on your device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Your camera does not support the required features.';
        } else if (err.name === 'AbortError') {
          errorMessage = 'Camera access was aborted.';
        }
        
        this.snackBar.open(errorMessage, 'Close', { 
          duration: 5000 
        });
      });
  }

  // Submit the appraisal
  submitAppraisal(): void {
    if (this.appraisalForm.invalid) {
      this.snackBar.open('Please fill out all required fields', 'Close', { duration: 3000 });
      return;
    }

    if (this.images.length === 0) {
      this.snackBar.open('Please add at least one image', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    this.appraisalError = null;
    
    const formData = this.appraisalForm.value;
    const request: WebAppraisalRequest = {
      imageData: this.images.at(0)?.value,
      ...formData
    };

    this.webAppraisalService.submitAppraisalRequest(request).subscribe({
      next: (result) => {
        this.currentAppraisal = result;
        this.processingStage = 'processing';
        this.startPolling(result.id);
        this.isSubmitting = false;
      },
      error: (error) => {
        this.appraisalError = error.message || 'Failed to submit appraisal request';
        this.isSubmitting = false;
      }
    });
  }

  startPolling(appraisalId: string): void {
    // Clear any existing polling
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
    
    // Start with initial progress
    this.processingProgress = 0;
    
    // Create a polling interval (every 3 seconds)
    this.pollingSubscription = interval(3000)
      .pipe(
        // Continue polling until status is 'completed' or 'failed'
        takeWhile(() => {
          return this.currentAppraisal?.status !== 'completed' && 
                 this.currentAppraisal?.status !== 'failed';
        }, true) // Include the last value that fails the predicate
      )
      .subscribe({
        next: () => {
          this.webAppraisalService.checkAppraisalStatus(appraisalId).subscribe({
            next: (result) => {
              console.log('Appraisal status update:', result);
              this.currentAppraisal = result;
              
              // Update progress if available
              if ('processingProgress' in result) {
                this.processingProgress = (result as any).processingProgress;
              }
              
              // Handle status changes
              if (result.status === 'completed') {
                this.processingStage = 'results';
                this.snackBar.open('Appraisal completed successfully', 'Close', { duration: 3000 });
              } else if (result.status === 'failed') {
                this.processingStage = 'form';
                this.appraisalError = result.error || 'Appraisal processing failed';
              }
            },
            error: (error) => {
              console.error('Error checking appraisal status:', error);
              this.appraisalError = 'Failed to check appraisal status: ' + (error.message || 'Unknown error');
              this.processingStage = 'form';
              
              // Stop polling on error
              if (this.pollingSubscription) {
                this.pollingSubscription.unsubscribe();
                this.pollingSubscription = null;
              }
            }
          });
        },
        complete: () => {
          console.log('Polling completed');
          this.pollingSubscription = null;
        }
      });
  }

  saveAppraisalToSystem(): void {
    if (!this.currentAppraisal) {
      this.snackBar.open('No appraisal result to save', 'Close', { duration: 3000 });
      return;
    }
    
    this.appraisalService.saveWebAppraisal(this.currentAppraisal).subscribe({
      next: (savedAppraisal) => {
        console.log('Appraisal saved:', savedAppraisal);
        this.snackBar.open('Appraisal saved successfully', 'View', { 
          duration: 5000 
        }).onAction().subscribe(() => {
          // Navigate to the saved appraisal detail view
          this.router.navigate(['/appraisals', savedAppraisal.id]);
        });
      },
      error: (error) => {
        console.error('Error saving appraisal:', error);
        this.appraisalError = 'Failed to save appraisal: ' + (error.message || 'Unknown error');
      }
    });
  }

  startOver(): void {
    this.processingStage = 'form';
    this.imageData = undefined;
    this.webcamImage = null;
    this.currentAppraisal = null;
    this.appraisalError = null;
    this.appraisalForm.reset();
    this.processingProgress = 0;
    
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }
  
  /**
   * Converts an object of item details into an array of key-value pairs for display
   * @param itemDetails Object containing item details
   * @returns Array of objects with key and value properties
   */
  getItemDetails(itemDetails: Record<string, any>): Array<{key: string, value: any}> {
    if (!itemDetails) {
      return [];
    }
    
    return Object.entries(itemDetails).map(([key, value]) => {
      // Format the key for display (capitalize first letter, add spaces before capital letters)
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
      
      return {
        key: formattedKey,
        value: value
      };
    });
  }

  // Handle canceling the appraisal process
  onCancel(): void {
    // Show a confirmation snackbar
    const snackBarRef = this.snackBar.open('Are you sure you want to cancel this appraisal?', 'Yes', {
      duration: 5000,
    });

    snackBarRef.onAction().subscribe(() => {
      // Clean up any ongoing processes
      if (this.pollingSubscription) {
        this.pollingSubscription.unsubscribe();
      }
      
      // Reset form and state
      this.appraisalForm.reset();
      this.images.clear();
      this.processingStage = 'form';
      this.processingProgress = 0;
      
      // Navigate back to the previous page
      this.router.navigate(['/profile/items']);
    });
  }
} 