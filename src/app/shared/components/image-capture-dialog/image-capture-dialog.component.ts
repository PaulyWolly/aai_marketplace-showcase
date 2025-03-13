import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import { Subject, Observable } from 'rxjs';

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
    public dialogRef: MatDialogRef<ImageCaptureDialogComponent>
  ) { }

  ngOnInit(): void {
    this.discoverAvailableDevices();
  }

  ngOnDestroy(): void {
    this.trigger.complete();
    this.nextWebcam.complete();
  }

  private async discoverAvailableDevices(): Promise<void> {
    try {
      const mediaDevices = await WebcamUtil.getAvailableVideoInputs();
      this.availableDevices = mediaDevices;
      this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
      
      if (mediaDevices && mediaDevices.length > 0) {
        console.log('Available cameras:', mediaDevices.map(d => d.label));
        
        // First try to find built-in laptop camera by common naming patterns
        const laptopCameraKeywords = [
          'built-in', 'internal', 'integrated', 
          'front', 'facetime', 'webcam', 
          'laptop', 'hd camera', 'camera hd'
        ];
        
        // Try to find a camera with laptop camera keywords in the name
        let laptopCamera = mediaDevices.find(device => {
          const label = device.label.toLowerCase();
          return laptopCameraKeywords.some(keyword => label.includes(keyword));
        });
        
        // If no match by name, use a heuristic: laptop cameras are usually listed first
        if (!laptopCamera && mediaDevices.length > 0) {
          // If there are exactly two cameras, the first one is usually the laptop camera
          // and the second one is usually the phone or external camera
          laptopCamera = mediaDevices[0];
        }
        
        if (laptopCamera) {
          console.log('Selected laptop camera:', laptopCamera.label);
          this.deviceId = laptopCamera.deviceId;
        } else {
          // Fallback to first camera
          this.deviceId = mediaDevices[0].deviceId;
          console.log('Fallback to first camera:', mediaDevices[0].label);
        }
        
        // Set the device ID in the video options
        this.videoOptions = {
          deviceId: this.deviceId
        };
      }
    } catch (error) {
      console.error('Error discovering webcam devices:', error);
    }
  }

  public triggerSnapshot(): void {
    this.trigger.next();
  }

  public toggleWebcam(): void {
    this.showWebcam = !this.showWebcam;
  }

  public handleInitError(error: WebcamInitError): void {
    this.errors.push(error);
  }

  public changeWebcam(deviceId: string): void {
    this.deviceId = deviceId;
    this.videoOptions = {
      deviceId: deviceId
    };
    this.nextWebcam.next(deviceId);
  }

  public handleImage(webcamImage: WebcamImage): void {
    this.webcamImage = webcamImage;
    this.showWebcam = false;
  }

  public cameraWasSwitched(deviceId: string): void {
    this.deviceId = deviceId;
    this.videoOptions = {
      deviceId: deviceId
    };
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
    this.dialogRef.close({
      imageData: this.webcamImage?.imageAsDataUrl
    });
  }

  public cancel(): void {
    this.dialogRef.close();
  }
} 