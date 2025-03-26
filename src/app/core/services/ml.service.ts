import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MLService {
  private apiUrl = `${environment.apiUrl}/ml`;

  constructor(private http: HttpClient) {}

  // Test TensorFlow.js functionality
  testTensorFlow(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`);
  }

  // Get model status
  getModelStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/status`);
  }

  // Train price prediction model
  trainPriceModel(data: any[], epochs: number = 100): Observable<any> {
    return this.http.post(`${this.apiUrl}/train/price`, { data, epochs });
  }

  // Train image classification model
  trainImageModel(data: any[], epochs: number = 50): Observable<any> {
    return this.http.post(`${this.apiUrl}/train/image`, { data, epochs });
  }

  // Predict price
  predictPrice(data: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/predict/price`, { data });
  }

  // Classify image
  classifyImage(imageData: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/classify/image`, { imageData });
  }

  // Find similar items
  findSimilarItems(itemId: string, count: number = 5): Observable<any> {
    return this.http.get(`${this.apiUrl}/similar/${itemId}?count=${count}`);
  }

  // Load model
  loadModel(type: 'price' | 'image', modelPath: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/load/${type}`, { modelPath });
  }
} 