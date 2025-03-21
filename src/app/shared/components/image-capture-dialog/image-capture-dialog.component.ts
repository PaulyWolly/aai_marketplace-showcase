import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import { Subject, Observable } from 'rxjs';

interface DialogData {
  multipleWebcams?: boolean;
  availableDevices?: MediaDeviceInfo[];
}

@Component({
  selector: 'app-image-capture-dialog',
  templateUrl: './image-capture-dialog.component.html',
  styleUrls: ['./image-capture-dialog.component.scss']
})
export class ImageCaptureDialogComponent implements OnInit, OnDestroy {
  // Webcam properties
  public showWebcam = true;
  public multipleWebcamsAvailable = false;
  public deviceId: string = '';
  public videoOptions: MediaTrackConstraints = {};
  public errors: WebcamInitError[] = [];
  public webcamImage: WebcamImage | null = null;
  public availableDevices: MediaDeviceInfo[] = [];

  // Webcam trigger
  private trigger: Subject<void> = new Subject<void>();
  private nextWebcam: Subject<boolean|string> = new Subject<boolean|string>();

  constructor(
    public dialogRef: MatDialogRef<ImageCaptureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) { }

  ngOnInit(): void {
    // Check if we have devices passed in from parent component
    if (this.data && this.data.availableDevices && this.data.availableDevices.length > 0) {
      this.availableDevices = this.data.availableDevices;
      this.multipleWebcamsAvailable = this.data.multipleWebcams || false;
      
      // Set first device as default if available
      if (this.availableDevices.length > 0 && this.availableDevices[0].deviceId) {
        this.deviceId = this.availableDevices[0].deviceId;
        this.videoOptions = {
          deviceId: { exact: this.deviceId }
        };
      }
    } else {
      // Fallback to discovering devices if not provided
      this.discoverCameras();
    }
  }

  ngOnDestroy(): void {
    // Make sure to properly clean up resources
    this.trigger.complete();
    this.nextWebcam.complete();
  }

  private discoverCameras(): void {
    WebcamUtil.getAvailableVideoInputs()
      .then((mediaDevices: MediaDeviceInfo[]) => {
        this.availableDevices = mediaDevices;
        this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
        
        // Select first device by default
        if (mediaDevices && mediaDevices.length > 0 && mediaDevices[0].deviceId) {
          this.deviceId = mediaDevices[0].deviceId;
          this.videoOptions = {
            deviceId: { exact: this.deviceId }
          };
        }
      })
      .catch(err => {
        console.error('Error getting camera devices', err);
        // Log error but don't try to push to errors array to avoid type issues
      });
  }

  public triggerSnapshot(): void {
    this.trigger.next();
  }

  public toggleWebcam(): void {
    this.showWebcam = !this.showWebcam;
  }

  public changeWebcam(deviceId: string): void {
    this.deviceId = deviceId;
    this.videoOptions = {
      deviceId: { exact: deviceId }
    };
    this.nextWebcam.next(deviceId);
  }

  public handleImage(webcamImage: WebcamImage): void {
    this.webcamImage = webcamImage;
    this.showWebcam = false;
  }

  public handleInitError(error: WebcamInitError): void {
    this.errors.push(error);
    console.error('Webcam initialization error:', error);
  }

  public cameraWasSwitched(deviceId: string): void {
    console.log('Camera switched to ' + deviceId);
    this.deviceId = deviceId;
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean|string> {
    return this.nextWebcam.asObservable();
  }

  public retake(): void {
    this.webcamImage = null;
    this.showWebcam = true;
  }

  public useImage(): void {
    if (!this.webcamImage || !this.webcamImage.imageAsDataUrl) {
      console.error('No image captured or image data is missing');
      return;
    }

    console.log('Processing webcam image, size:', this.webcamImage.imageAsDataUrl.length);

    try {
      // Make sure the image data is valid before returning it
      if (!this.webcamImage.imageAsDataUrl.startsWith('data:image/')) {
        console.error('Invalid image data format:', 
          this.webcamImage.imageAsDataUrl.substring(0, 30) + '...');
        return;
      }
      
      // Resize the image before returning it
      this.resizeImage(this.webcamImage.imageAsDataUrl, 800).then(resizedImage => {
        // Log more details about the image being returned
        console.log('Image format:', 
          resizedImage.substring(0, resizedImage.indexOf(';')));
        console.log(`Resized webcam image from ${this.webcamImage!.imageAsDataUrl.length} to ${resizedImage.length} bytes`);
        
        // Return the image data to the parent component
        this.dialogRef.close({
          imageData: resizedImage
        });
        
        console.log('Dialog closed with resized image data');
      }).catch(err => {
        console.error('Error resizing image:', err);
        // Fall back to original image if resizing fails
        this.dialogRef.close({
          imageData: this.webcamImage!.imageAsDataUrl
        });
        console.log('Dialog closed with original (unresized) image data');
      });
    } catch (err) {
      console.error('Error closing dialog with image data:', err);
    }
  }
  
  /**
   * Resizes an image to the specified maximum width while maintaining aspect ratio
   * @param dataUrl The data URL of the image
   * @param maxWidth The maximum width of the resized image
   * @returns A promise that resolves to the resized image data URL
   */
  private resizeImage(dataUrl: string, maxWidth: number): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create a new image element
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          // Only resize if the image is larger than maxWidth
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = Math.floor(height * ratio);
          }
          
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Draw the resized image on the canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Could not get canvas context');
            resolve(dataUrl); // Return original if we can't resize
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert the canvas to a data URL (JPEG format for better compression)
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          resolve(resizedDataUrl);
        };
        
        img.onerror = () => {
          console.error('Error loading image for resizing');
          resolve(dataUrl); // Return original if we can't load the image
        };
        
        img.src = dataUrl;
      } catch (err) {
        console.error('Error resizing image:', err);
        resolve(dataUrl); // Return original if we can't resize
      }
    });
  }

  public cancel(): void {
    this.dialogRef.close();
  }
} 