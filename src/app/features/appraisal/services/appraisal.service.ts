import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface Appraisal {
  _id?: string;
  userId?: string;
  name: string;
  category: string;
  condition: string;
  estimatedValue: string;
  imageUrl: string;
  images?: string[];
  timestamp?: Date;
  height?: string;
  width?: string;
  weight?: string;
  appraisal: {
    details: string;
    marketResearch: string;
  };
  isPublished?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AppraisalService {
  private apiUrl = `${environment.apiUrl}/appraisals`;

  constructor(private http: HttpClient) {}

  async saveAppraisal(appraisalData: Partial<Appraisal>) {
    // Ensure we have the isPublished flag set to true by default
    if (appraisalData.isPublished === undefined) {
      appraisalData.isPublished = true;
    }
    
    // Make sure we have the images array properly set
    if (appraisalData.images && appraisalData.images.length > 0) {
      // Set the first image as the main imageUrl if not already set
      if (!appraisalData.imageUrl) {
        appraisalData.imageUrl = appraisalData.images[0];
      }
    }
    
    // Ensure all required fields are present
    const completeAppraisal: Appraisal = {
      name: appraisalData.name || 'Unknown Item',
      category: appraisalData.category || 'Miscellaneous',
      condition: appraisalData.condition || 'Unknown',
      estimatedValue: appraisalData.estimatedValue || 'Unknown',
      imageUrl: appraisalData.imageUrl || '',
      height: appraisalData.height || '',
      width: appraisalData.width || '',
      weight: appraisalData.weight || '',
      appraisal: {
        details: appraisalData.appraisal?.details || 'No details available',
        marketResearch: appraisalData.appraisal?.marketResearch || 'No market research available'
      },
      isPublished: appraisalData.isPublished,
      timestamp: appraisalData.timestamp || new Date(),
      ...appraisalData
    };
    
    console.log('Saving appraisal data:', completeAppraisal);
    return this.http.post<Appraisal>(`${this.apiUrl}/save`, completeAppraisal).toPromise();
  }

  getUserAppraisals(userId?: string) {
    const url = userId ? `${this.apiUrl}/user/${userId}` : `${this.apiUrl}/user`;
    console.log(`Fetching appraisals from: ${url}`);
    
    return this.http.get<Appraisal[]>(url)
      .toPromise()
      .then(appraisals => {
        console.log(`Received ${appraisals?.length || 0} appraisals`);
        return appraisals;
      })
      .catch(error => {
        console.error(`Error fetching appraisals from ${url}:`, error);
        // Return empty array instead of rejecting the promise
        return [];
      });
  }

  getAllAppraisals() {
    return this.http.get<Appraisal[]>(`${this.apiUrl}/all`).toPromise();
  }

  getAppraisalById(id: string) {
    return this.http.get<Appraisal>(`${this.apiUrl}/${id}`).toPromise();
  }

  deleteAppraisal(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).toPromise();
  }

  // Get all published appraisals for the showcase
  getPublishedAppraisals() {
    return this.http.get<Appraisal[]>(`${this.apiUrl}/published`).toPromise();
  }

  // Toggle the published status of an appraisal
  togglePublished(id: string, isPublished: boolean) {
    return this.http.patch<Appraisal>(`${this.apiUrl}/${id}/publish`, { isPublished }).toPromise();
  }

  private async optimizeImage(imageData: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  }

  async analyzeImage(imageData: string) {
    try {
      const optimizedImage = await this.optimizeImage(imageData);
      const response = await this.http.post(`${this.apiUrl}/analyze`, { 
        imageData: optimizedImage 
      }).toPromise();
      return response;
    } catch (error) {
      console.error('Error optimizing or analyzing image:', error);
      throw error;
    }
  }
} 