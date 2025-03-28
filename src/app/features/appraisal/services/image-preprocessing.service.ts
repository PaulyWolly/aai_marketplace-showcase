import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImagePreprocessingService {
  private apiUrl = `${environment.apiUrl}/image-preprocessing`;

  constructor(private http: HttpClient) {}

  /**
   * Preprocess an image before appraisal
   * @param imageData Base64 encoded image data
   * @returns Observable of the preprocessed image data
   */
  preprocessImage(imageData: string): Observable<string> {
    return this.http.post<{ processedImage: string }>(`${this.apiUrl}/preprocess`, { imageData })
      .pipe(
        map(response => response.processedImage)
      );
  }

  /**
   * Extract color features from an image
   * @param imageData Base64 encoded image data
   * @returns Observable of the color features
   */
  extractColorFeatures(imageData: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/color-features`, { imageData });
  }
} 