import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { WebAppraisalResult } from './web-appraisal.service';
import { firstValueFrom } from 'rxjs';
import { ShowcaseService } from '../../showcase/services/showcase.service';

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
  
  constructor(
    private http: HttpClient,
    private showcaseService: ShowcaseService
  ) { }
  
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
    return this.http.patch<Appraisal>(`${this.apiUrl}/${id}/publish`, { isPublished })
      .pipe(
        tap(result => {
          // Clear showcase cache when publishing status changes
          this.clearShowcaseCache(id);
        })
      );
  }
  
  /**
   * Save a web appraisal result as a permanent appraisal
   */
  saveWebAppraisal(webAppraisal: WebAppraisalResult): Observable<Appraisal> {
    console.log('Converting web appraisal to standard format:', webAppraisal);
    
    // Convert web appraisal to standard format
    const standardAppraisal = {
      name: webAppraisal.aggregatedResult.suggestedName,
      category: webAppraisal.aggregatedResult.suggestedCategory,
      condition: webAppraisal.aggregatedResult.suggestedCondition,
      estimatedValue: `${webAppraisal.aggregatedResult.estimatedValueRange.min} - ${webAppraisal.aggregatedResult.estimatedValueRange.max}`,
      imageUrl: webAppraisal.imageUrl,
      appraisal: {
        details: webAppraisal.aggregatedResult.suggestedDescription,
        marketResearch: webAppraisal.sources.map(s => `${s.name}: ${s.description}`).join('\n\n')
      },
      isPublished: false,
      timestamp: new Date()
    };

    console.log('Saving converted appraisal:', standardAppraisal);
    
    // Use the standard save endpoint
    return this.http.post<Appraisal>(`${this.apiUrl}/save`, standardAppraisal)
      .pipe(
        tap(result => {
          if (result && result._id) {
            this.clearShowcaseCache(result._id);
          }
        })
      );
  }
  
  /**
   * Delete an appraisal
   */
  deleteAppraisal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(() => {
          // Clear showcase cache when an item is deleted
          this.clearShowcaseCache(id);
        })
      );
  }
  
  /**
   * Update appraisal notes
   */
  updateAppraisalNotes(id: string, notes: string): Observable<Appraisal> {
    return this.http.patch<Appraisal>(`${this.apiUrl}/${id}`, { notes })
      .pipe(
        tap(() => {
          // Clear showcase cache when notes are updated
          this.clearShowcaseCache(id);
        })
      );
  }
  
  // Helper method to clear showcase cache
  private clearShowcaseCache(id: string): void {
    console.log(`Clearing showcase cache for item: ${id}`);
    this.showcaseService.clearCacheForItem(id);
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
  
  // Add detailed request logging
  private logRequest(method: string, url: string, data: any): void {
    console.group(`API Request: ${method} ${url}`);
    console.log('Headers: Authorization Bearer token (hidden)');
    console.log('Request data:', JSON.stringify(data, null, 2));
    
    // Log specific field formats to check for type issues
    if (data) {
      console.log('Data types:');
      Object.keys(data).forEach(key => {
        const value = data[key];
        console.log(`- ${key}: ${typeof value} ${Array.isArray(value) ? '(array)' : ''} ${value === null ? '(null)' : ''}`);
        
        // For specific fields that might cause issues, do deeper inspection
        if (key === 'estimatedValue' || key === 'year' || key === '_id') {
          console.log(`  Detail: ${key} = ${String(value)} (${typeof value})`);
        }
        
        // Log nested object types
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.keys(value).forEach(nestedKey => {
            const nestedValue = value[nestedKey];
            console.log(`  - ${key}.${nestedKey}: ${typeof nestedValue} ${Array.isArray(nestedValue) ? '(array)' : ''}`);
          });
        }
      });
    }
    console.groupEnd();
  }
  
  // Modify saveAppraisal to use this logging
  async saveAppraisal(appraisalData: Partial<Appraisal>): Promise<Appraisal> {
    console.log('=== APPRAISAL SERVICE: saveAppraisal called ===');
    
    // Convert id to _id for backward compatibility
    if (appraisalData.id && !appraisalData._id) {
      appraisalData._id = appraisalData.id;
      console.log('Converted id to _id:', appraisalData._id);
    }
    
    // Convert title to name for backward compatibility
    if (appraisalData.title && !appraisalData.name) {
      appraisalData.name = appraisalData.title;
      console.log('Converted title to name:', appraisalData.name);
    }
    
    // Ensure timestamp is set
    if (!appraisalData.timestamp) {
      appraisalData.timestamp = new Date();
      console.log('Set timestamp to current date');
    }
    
    // Type check and convert numeric fields to string if needed
    const numericFields = ['estimatedValue', 'year'];
    numericFields.forEach(field => {
      const fieldKey = field as keyof Partial<Appraisal>;
      if (appraisalData[fieldKey] !== undefined && appraisalData[fieldKey] !== null) {
        const originalValue = appraisalData[fieldKey];
        const originalType = typeof originalValue;
        
        // Ensure it's a string
        if (originalType !== 'string') {
          appraisalData[fieldKey] = String(appraisalData[fieldKey]) as any;
          console.log(`Converted ${field} from ${originalType} (${originalValue}) to string (${appraisalData[fieldKey]})`);
        }
      }
    });
    
    // Ensure appraisal object has correct structure if it exists
    if (appraisalData.appraisal) {
      console.log('Appraisal object found:', appraisalData.appraisal);
      
      // If appraisal is a string (might happen in some error cases), try to parse it
      if (typeof appraisalData.appraisal === 'string') {
        try {
          console.warn('Appraisal is a string, attempting to parse as JSON');
          appraisalData.appraisal = JSON.parse(appraisalData.appraisal as string) as Appraisal['appraisal'];
          console.log('Successfully parsed appraisal string to object');
        } catch (e) {
          console.error('Failed to parse appraisal string:', e);
          // Create a new appraisal object with the string as details
          appraisalData.appraisal = {
            details: appraisalData.appraisal as unknown as string,
            marketResearch: ''
          };
          console.log('Created new appraisal object with string as details');
        }
      }
      
      // We know appraisal exists at this point but need to ensure its fields exist
      // Type assertion to make TypeScript happy
      if (appraisalData.appraisal) {
        // Safe to access and modify now
        if (!appraisalData.appraisal.details) {
          console.warn('Adding empty details to appraisal object');
          appraisalData.appraisal.details = '';
        }
        
        if (!appraisalData.appraisal.marketResearch) {
          console.warn('Adding empty marketResearch to appraisal object');
          appraisalData.appraisal.marketResearch = '';
        }
      }
    } else {
      console.warn('No appraisal object in data, creating empty one');
      appraisalData.appraisal = {
        details: '',
        marketResearch: ''
      };
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
          
          // Log the URL being used and request data
          this.logRequest('PUT', url, appraisalData);
          
          // First try with direct endpoint
          try {
            const result = await firstValueFrom(
              this.http.put<Appraisal>(url, appraisalData)
            );
            console.log('Update result:', result);
            
            // Clear the showcase cache for this item
            if (result && (result._id || result.id)) {
              const itemId = result._id || result.id;
              this.clearShowcaseCache(itemId as string);
            }
            
            return result as Appraisal;
          } catch (directErr: any) {
            console.error(`Error with direct endpoint (${url}):`, directErr);
            console.error('Error status:', directErr.status);
            console.error('Error message:', directErr.message);
            
            if (directErr.error) {
              console.error('Error response body:', directErr.error);
            }
            
            // If direct endpoint fails with 404, try the /save endpoint as fallback
            if (directErr.status === 404) {
              console.log('Trying fallback endpoint: /save');
              // Log the fallback request
              this.logRequest('POST', `${this.apiUrl}/save`, appraisalData);
              
              const fallbackResult = await firstValueFrom(
                this.http.post<Appraisal>(`${this.apiUrl}/save`, appraisalData)
              );
              console.log('Fallback update result:', fallbackResult);
              
              // Clear the showcase cache for this item
              if (fallbackResult && (fallbackResult._id || fallbackResult.id)) {
                const itemId = fallbackResult._id || fallbackResult.id;
                this.clearShowcaseCache(itemId as string);
              }
              
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
          
          // Log the URL being used and request data 
          this.logRequest('POST', url, appraisalData);
          
          const result = await firstValueFrom(
            this.http.post<Appraisal>(url, appraisalData)
          );
          console.log('Create result:', result);
          
          // Clear the showcase cache for this item
          if (result && (result._id || result.id)) {
            const itemId = result._id || result.id;
            this.clearShowcaseCache(itemId as string);
          }
          
          return result as Appraisal;
        } catch (directErr: any) {
          console.error(`Error with direct endpoint:`, directErr);
          console.error('Error status:', directErr.status);
          console.error('Error message:', directErr.message);
          
          if (directErr.error) {
            console.error('Error response body:', directErr.error);
          }
          
          // If direct endpoint fails, try the /save endpoint as fallback
          if (directErr.status === 404 || directErr.status === 400) {
            console.log('Trying fallback endpoint: /save');
            // Log the fallback request
            this.logRequest('POST', `${this.apiUrl}/save`, appraisalData);
            
            try {
              const fallbackResult = await firstValueFrom(
                this.http.post<Appraisal>(`${this.apiUrl}/save`, appraisalData)
              );
              console.log('Fallback create result:', fallbackResult);
              
              // Clear the showcase cache for this item
              if (fallbackResult && (fallbackResult._id || fallbackResult.id)) {
                const itemId = fallbackResult._id || fallbackResult.id;
                this.clearShowcaseCache(itemId as string);
              }
              
              return fallbackResult as Appraisal;
            } catch (fallbackErr: any) {
              console.error('Error with fallback endpoint:', fallbackErr);
              console.error('Fallback error status:', fallbackErr.status);
              console.error('Fallback error message:', fallbackErr.message);
              
              if (fallbackErr.error) {
                console.error('Fallback error response body:', fallbackErr.error);
                
                // Try to extract meaningful validation errors
                if (fallbackErr.error.message && fallbackErr.error.missingFields) {
                  console.error('Validation failed. Missing fields:', fallbackErr.error.missingFields);
                  throw new Error(`Validation failed: Missing required fields: ${fallbackErr.error.missingFields.join(', ')}`);
                }
              }
              
              throw fallbackErr;
            }
          }
          
          throw directErr;
        }
      }
    } catch (error: any) {
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
      } else if (error.status === 400) {
        // Try to extract detailed validation errors
        if (error.error && error.error.message) {
          throw new Error(`Bad request: ${error.error.message}`);
        } else if (error.error && typeof error.error === 'string') {
          throw new Error(`Bad request: ${error.error}`);
        }
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