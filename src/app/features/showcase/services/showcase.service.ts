import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Appraisal } from '../../appraisal/services/appraisal.service';

@Injectable({
  providedIn: 'root'
})
export class ShowcaseService {
  private apiUrl = `${environment.apiUrl}/appraisals`;

  constructor(private http: HttpClient) {}

  async getShowcaseItems() {
    try {
      console.log('Fetching showcase items from:', `${this.apiUrl}/published`);
      const items = await this.http.get<Appraisal[]>(`${this.apiUrl}/published`).toPromise();
      console.log('Received showcase items:', items);
      return items;
    } catch (error) {
      console.error('Error fetching showcase items:', error);
      return [];
    }
  }

  async getItemById(id: string) {
    try {
      console.log('Fetching item by ID:', id, 'from URL:', `${this.apiUrl}/${id}`);
      
      // First try to get the item directly from the appraisals endpoint
      const item = await this.http.get<Appraisal>(`${this.apiUrl}/${id}`).toPromise();
      
      console.log('Received item:', item);
      return item;
    } catch (error) {
      console.error('Error fetching item by ID:', id, error);
      
      // Try a fallback approach - check if the item exists in the published items
      try {
        console.log('Attempting fallback - checking published items');
        const publishedItems = await this.getShowcaseItems();
        const matchingItem = publishedItems?.find(item => item._id === id);
        
        if (matchingItem) {
          console.log('Found item in published items:', matchingItem);
          return matchingItem;
        }
      } catch (fallbackError) {
        console.error('Fallback approach also failed:', fallbackError);
      }
      
      if (error instanceof HttpErrorResponse) {
        console.error('Status:', error.status, 'Message:', error.message);
        if (error.error) {
          console.error('Error details:', error.error);
        }
        
        // Create a fallback item for display purposes
        if (error.status === 404) {
          return this.createFallbackItem(id, 'Item not found');
        } else if (error.status === 403) {
          return this.createFallbackItem(id, 'You do not have permission to view this item');
        } else if (error.status === 0) {
          return this.createFallbackItem(id, 'Network error - please check your connection');
        }
      }
      
      // For other errors, create a generic fallback
      return this.createFallbackItem(id, 'Error loading item');
    }
  }
  
  private createFallbackItem(id: string, errorMessage: string): Appraisal {
    const placeholderImage = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%3E%3Crect%20width%3D%22200%22%20height%3D%22200%22%20fill%3D%22%23CCCCCC%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23333333%22%3EImage%20Not%20Available%3C%2Ftext%3E%3C%2Fsvg%3E';
    
    return {
      _id: id,
      name: 'Error Loading Item',
      category: 'Unknown',
      condition: 'Unknown',
      estimatedValue: 'N/A',
      imageUrl: placeholderImage,
      appraisal: {
        details: `**Error:** ${errorMessage}`,
        marketResearch: 'No market research available due to an error.'
      },
      timestamp: new Date(),
      userId: '',
      isPublished: false
    };
  }

  deleteItem(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
} 