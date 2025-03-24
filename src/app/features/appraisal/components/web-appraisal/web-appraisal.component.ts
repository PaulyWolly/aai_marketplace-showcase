import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import { Subject, Observable, interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { WebAppraisalService, WebAppraisalRequest, WebAppraisalResult } from '../../services/web-appraisal.service';
import { AppraisalService } from '../../services/appraisal.service';
import { CategoriesService } from '../../../../core/services/categories.service';

@Component({
  selector: 'app-web-appraisal',
  templateUrl: './web-appraisal.component.html',
  styleUrls: ['./web-appraisal.component.scss']
})
export class WebAppraisalComponent implements OnInit, OnDestroy {
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
  itemTypes = [
    'Antique',
    'Jewelry',
    'Vintage Clothing',
    'Collectible',
    'Artwork',
    'Furniture',
    'Watch/Timepiece',
    'Coin/Currency',
    'Other'
  ];
  
  // Appraisal process properties
  imageData: string | undefined;
  isSubmitting = false;
  currentAppraisal: WebAppraisalResult | null = null;
  appraisalError: string | null = null;
  processingStage: 'capture' | 'details' | 'processing' | 'results' = 'capture';
  pollingSubscription: Subscription | null = null;
  processingProgress = 0;
  
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private webAppraisalService: WebAppraisalService,
    private appraisalService: AppraisalService,
    private categoriesService: CategoriesService,
    private snackBar: MatSnackBar
  ) {
    this.appraisalForm = this.fb.group({
      itemType: ['', Validators.required],
      additionalInfo: ['']
    });
  }

  async ngOnInit() {
    await this.scanForDevices();
  }
  
  ngOnDestroy() {
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
    this.processingStage = 'details';
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

  // File upload handling
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
        return;
      }
      
      // Convert the file to a data URL
      const reader = new FileReader();
      reader.onload = () => {
        this.imageData = reader.result as string;
        this.processingStage = 'details';
      };
      reader.readAsDataURL(file);
      
      // Reset the input so the same file can be selected again
      input.value = '';
    }
  }

  // Form submission and appraisal process
  submitAppraisal(): void {
    if (!this.imageData) {
      this.snackBar.open('Please capture or upload an image first', 'Close', { duration: 3000 });
      return;
    }

    if (this.appraisalForm.invalid) {
      this.snackBar.open('Please fill out all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    this.appraisalError = null;
    
    const request: WebAppraisalRequest = {
      imageData: this.imageData,
      itemType: this.appraisalForm.get('itemType')?.value,
      additionalInfo: this.appraisalForm.get('additionalInfo')?.value
    };

    this.webAppraisalService.submitAppraisalRequest(request).subscribe({
      next: (result) => {
        console.log('Appraisal request submitted:', result);
        this.currentAppraisal = result;
        this.processingStage = 'processing';
        this.startPolling(result.id);
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error submitting appraisal request:', error);
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
                this.processingStage = 'capture';
                this.appraisalError = result.error || 'Appraisal processing failed';
              }
            },
            error: (error) => {
              console.error('Error checking appraisal status:', error);
              this.appraisalError = 'Failed to check appraisal status: ' + (error.message || 'Unknown error');
              this.processingStage = 'capture';
              
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
    this.processingStage = 'capture';
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
} 