import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import { Subject, Observable } from 'rxjs';
import { AppraisalService } from '../../services/appraisal.service';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: 'app-appraisal-capture',
  templateUrl: './appraisal-capture.component.html',
  styleUrls: ['./appraisal-capture.component.scss']
})
export class AppraisalCaptureComponent implements OnInit, OnDestroy {
  private trigger: Subject<void> = new Subject<void>();
  private nextWebcam: Subject<boolean> = new Subject<boolean>();
  
  public videoOptions: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user"
  };

  public webcamConfig = {
    width: 640,
    height: 480,
    imageQuality: 0.92,
    imageType: "image/jpeg"
  };

  public showWebcam = false;
  public imageData: string | undefined;
  public error: string | undefined;
  public analyzing = false;
  public devices: MediaDeviceInfo[] = [];
  public selectedDevice: string | undefined;
  public isScanning = false;
  public isCameraActive = false;

  constructor(
    private router: Router,
    private appraisalService: AppraisalService
  ) {}

  async ngOnInit() {
    await this.scanForDevices();
  }

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
    this.error = undefined;
    
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
      this.error = `Failed to scan for cameras: ${err.message}`;
    } finally {
      this.isScanning = false;
    }
  }

  async connectCamera() {
    if (!this.selectedDevice) {
      this.error = 'Please select a camera device first';
      return;
    }

    try {
      this.videoOptions = {
        ...this.videoOptions,
        deviceId: { exact: this.selectedDevice }
      };

      await navigator.mediaDevices.getUserMedia({
        video: this.videoOptions,
        audio: false
      });

      this.showWebcam = true;
      this.isCameraActive = true;
      this.error = undefined;
    } catch (err: any) {
      console.error('Error connecting to camera:', err);
      this.error = `Failed to connect to camera: ${err.message}`;
      this.showWebcam = false;
      this.isCameraActive = false;
    }
  }

  async disconnectCamera() {
    this.showWebcam = false;
    this.isCameraActive = false;
    this.imageData = undefined;
    this.error = undefined;
  }

  async refreshDevices() {
    await this.scanForDevices();
  }

  async onCameraSelect(event: MatSelectChange) {
    this.selectedDevice = event.value;
    if (this.isCameraActive) {
      await this.connectCamera();
    }
  }

  ngOnDestroy() {
    this.disconnectCamera();
    this.trigger.complete();
    this.nextWebcam.complete();
  }

  public triggerSnapshot(): void {
    this.trigger.next();
  }

  public handleImage(webcamImage: WebcamImage): void {
    console.log('Received webcam image:', webcamImage);
    this.imageData = webcamImage.imageAsDataUrl;
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
      errorMessage += 'No camera signal detected. Please check if: \n1. Your camera privacy shutter is open\n2. The camera is properly connected';
    } else if (error.mediaStreamError && error.mediaStreamError.name === 'NotReadableError') {
      errorMessage += 'Cannot read camera. Please check if:\n1. Your camera privacy shutter is open\n2. Another application is using the camera';
    } else {
      errorMessage += error.message || 'Unknown error occurred';
    }
    
    this.error = errorMessage;
    this.showWebcam = false;
    this.isCameraActive = false;
  }

  public retake(): void {
    this.imageData = undefined;
    this.error = undefined;
    this.showWebcam = true;
  }

  public async analyze(): Promise<void> {
    if (!this.imageData) return;

    this.analyzing = true;
    try {
      // Create a base object with the image data
      const appraisalData = {
        imageUrl: this.imageData,
        timestamp: new Date(),
        appraisal: {
          details: '',
          marketResearch: ''
        }
      };

      // Call the API to analyze the image
      const result = await this.appraisalService.analyzeImage(this.imageData);
      
      // Merge the API result with our base object
      const completeResult = {
        ...appraisalData,
        ...result
      };
      
      console.log('Sending to results component:', completeResult);
      
      // Navigate to the results page with the complete data
      this.router.navigate(['/appraisal/results'], { 
        state: { appraisalData: completeResult } 
      });
    } catch (err: any) {
      console.error('Error analyzing image:', err);
      this.error = `Analysis failed: ${err.message || 'Please try again'}`;
    } finally {
      this.analyzing = false;
    }
  }
} 