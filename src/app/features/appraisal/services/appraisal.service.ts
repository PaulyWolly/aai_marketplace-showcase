import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { WebAppraisalResult } from './web-appraisal.service';
import { firstValueFrom } from 'rxjs';

export interface Appraisal {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  estimatedValue: string;
  valueRange: {
    min: string;
    max: string;
  };
  confidence: number;
  imageUrl: string;
  createdAt: string;
  sources: string[];
  notes?: string;
  
  // Legacy properties for backward compatibility
  _id?: string;
  name?: string;
  timestamp?: Date;
  images?: string[];
  appraisal?: {
    details: string;
    marketResearch: string;
  };
  isPublished?: boolean;
  
  // Additional properties used in other components
  userId?: string;
  height?: string;
  width?: string;
  weight?: string;
  price?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppraisalService {
  private apiUrl = `${environment.apiUrl}/appraisals`;
  
  constructor(private http: HttpClient) { }
  
  /**
   * Get all appraisals for the current user
   */
  getUserAppraisals(userId?: string): Observable<Appraisal[]> {
    const url = userId ? `${this.apiUrl}/user/${userId}` : `${this.apiUrl}/user`;
    return this.http.get<Appraisal[]>(url);
  }
  
  /**
   * Get a specific appraisal by ID
   */
  getAppraisal(id: string): Observable<Appraisal> {
    return this.http.get<Appraisal>(`${this.apiUrl}/${id}`);
  }
  
  /**
   * Get all appraisals (admin only)
   */
  getAllAppraisals(): Observable<Appraisal[]> {
    return this.http.get<Appraisal[]>(`${this.apiUrl}/all`);
  }
  
  /**
   * Toggle the published status of an appraisal
   */
  togglePublished(id: string, isPublished: boolean): Observable<Appraisal> {
    return this.http.patch<Appraisal>(`${this.apiUrl}/${id}/publish`, { isPublished });
  }
  
  /**
   * Save a web appraisal result as a permanent appraisal
   */
  saveWebAppraisal(webAppraisal: WebAppraisalResult): Observable<Appraisal> {
    console.log('Saving web appraisal:', webAppraisal);
    return this.http.post<Appraisal>(`${this.apiUrl}/web`, webAppraisal);
  }
  
  /**
   * Delete an appraisal
   */
  deleteAppraisal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  
  /**
   * Update appraisal notes
   */
  updateAppraisalNotes(id: string, notes: string): Observable<Appraisal> {
    return this.http.patch<Appraisal>(`${this.apiUrl}/${id}`, { notes });
  }
  
  // Legacy methods for backward compatibility
  
  /**
   * @deprecated Use getAppraisal instead
   */
  getAppraisalById(id: string): Promise<Appraisal> {
    return firstValueFrom(this.getAppraisal(id)).then(result => {
      if (!result) {
        throw new Error('Appraisal not found');
      }
      return result;
    });
  }
  
  /**
   * @deprecated Use getUserAppraisals instead
   */
  async fetchUserAppraisals(userId?: string): Promise<Appraisal[]> {
    try {
      console.log('Fetching user appraisals');
      const result = await firstValueFrom(this.getUserAppraisals(userId));
      console.log('Fetched appraisals:', result);
      return result || [];
    } catch (error) {
      console.error('Error fetching appraisals:', error);
      return [];
    }
  }
  
  /**
   * @deprecated Use saveWebAppraisal or direct HTTP calls instead
   */
  async saveAppraisal(appraisalData: Partial<Appraisal>): Promise<Appraisal> {
    // Convert id to _id for backward compatibility
    if (appraisalData.id && !appraisalData._id) {
      appraisalData._id = appraisalData.id;
    }
    
    // Convert title to name for backward compatibility
    if (appraisalData.title && !appraisalData.name) {
      appraisalData.name = appraisalData.title;
    }
    
    // Ensure timestamp is set
    if (!appraisalData.timestamp) {
      appraisalData.timestamp = new Date();
    }
    
    // Check if images are too large and might cause issues
    if (appraisalData.images && appraisalData.images.length > 0) {
      let totalSize = 0;
      appraisalData.images.forEach(img => {
        if (typeof img === 'string') {
          totalSize += img.length;
        }
      });
      
      console.log(`Total size of images: ${totalSize} bytes (${Math.round(totalSize/1024/1024 * 100) / 100} MB)`);
      
      if (totalSize > 5000000) {
        console.warn('Images payload is very large (>5MB). This might cause issues with the API call.');
      }
    }
    
    try {
      // If we have an ID, update the existing appraisal
      if (appraisalData._id) {
        console.log('Updating existing appraisal:', appraisalData._id);
        try {
          // Check if the endpoint uses /save or direct endpoint
          let url = `${this.apiUrl}/${appraisalData._id}`;
          
          // Log the URL being used
          console.log(`Trying to update appraisal at URL: ${url}`);
          
          // First try with direct endpoint
          try {
            const result = await firstValueFrom(
              this.http.put<Appraisal>(url, appraisalData)
            );
            console.log('Update result:', result);
            return result as Appraisal;
          } catch (directErr: any) {
            console.error(`Error with direct endpoint (${url}):`, directErr);
            
            // If direct endpoint fails with 404, try the /save endpoint as fallback
            if (directErr.status === 404) {
              console.log('Trying fallback endpoint: /save');
              const fallbackResult = await firstValueFrom(
                this.http.post<Appraisal>(`${this.apiUrl}/save`, appraisalData)
              );
              console.log('Fallback update result:', fallbackResult);
              return fallbackResult as Appraisal;
            }
            
            throw directErr;
          }
        } catch (err) {
          console.error('Error during update request:', err);
          throw err;
        }
      } else {
        // Otherwise create a new appraisal
        console.log('Creating new appraisal');
        try {
          // Check if we should use /save endpoint or direct endpoint
          let url = this.apiUrl;
          
          // Log the URL being used
          console.log(`Trying to create appraisal at URL: ${url}`);
          
          const result = await firstValueFrom(
            this.http.post<Appraisal>(url, appraisalData)
          );
          console.log('Create result:', result);
          return result as Appraisal;
        } catch (directErr: any) {
          console.error(`Error with direct endpoint:`, directErr);
          
          // If direct endpoint fails, try the /save endpoint as fallback
          if (directErr.status === 404 || directErr.status === 400) {
            console.log('Trying fallback endpoint: /save');
            try {
              const fallbackResult = await firstValueFrom(
                this.http.post<Appraisal>(`${this.apiUrl}/save`, appraisalData)
              );
              console.log('Fallback create result:', fallbackResult);
              return fallbackResult as Appraisal;
            } catch (fallbackErr: any) {
              console.error('Error with fallback endpoint:', fallbackErr);
              throw fallbackErr;
            }
          }
          
          throw directErr;
        }
      }
    } catch (error: any) { // Cast error to any type for property access
      console.error('Error saving appraisal:', error);
      
      // Try to provide more detailed error information
      if (error.status === 413) {
        throw new Error('Image is too large. Please use a smaller image or reduce its quality.');
      } else if (error.status === 504) {
        throw new Error('Request timed out. The image might be too large to process.');
      } else if (error.status === 500) {
        throw new Error('Server error occurred. Please try again with a smaller image.');
      } else if (error.status === 404) {
        throw new Error(`API endpoint not found. The API structure might have changed.`);
      }
      
      throw new Error(error.message || 'Failed to save appraisal');
    }
  }
  
  /**
   * @deprecated Use direct HTTP calls instead
   */
  async analyzeImage(imageData: string): Promise<any> {
    // Real implementation that calls the backend API
    console.log('Analyzing image...');
    try {
      const result = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/analyze`, { imageData })
      );
      console.log('Analysis result:', result);
      return result;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error('Failed to analyze image. Please try again.');
    }
  }
} 