import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Appraisal } from '../../appraisal/services/appraisal.service';

interface CacheEntry {
  data: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ShowcaseService {
  private apiUrl = `${environment.apiUrl}/appraisals`;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(private http: HttpClient) {}

  async getShowcaseItems() {
    try {
      // Check cache first
      const cacheKey = 'showcase_items';
      const cachedItems = this.getFromCache(cacheKey);
      
      if (cachedItems) {
        console.log('Retrieved showcase items from cache');
        return cachedItems;
      }
      
      console.log('Fetching showcase items from:', `${this.apiUrl}/published`);
      const items = await this.http.get<Appraisal[]>(`${this.apiUrl}/published`).toPromise();
      console.log('Received showcase items:', items);
      
      // Store in cache
      if (items) {
        this.saveToCache(cacheKey, items);
      }
      
      return items;
    } catch (error) {
      console.error('Error fetching showcase items:', error);
      return [];
    }
  }

  async getUserItems(userId: string) {
    try {
      // Check cache first
      const cacheKey = `user_items_${userId}`;
      const cachedItems = this.getFromCache(cacheKey);
      
      if (cachedItems) {
        console.log('Retrieved user items from cache for user:', userId);
        return cachedItems;
      }
      
      console.log('Fetching items for user:', userId);
      const items = await this.http.get<Appraisal[]>(`${this.apiUrl}/user/${userId}`).toPromise();
      console.log('Received user items:', items);
      
      // Store in cache
      if (items) {
        this.saveToCache(cacheKey, items);
      }
      
      return items;
    } catch (error) {
      console.error('Error fetching user items:', error);
      return [];
    }
  }

  async getItemById(id: string) {
    try {
      console.log('Fetching item by ID:', id, 'from URL:', `${this.apiUrl}/${id}`);
      
      // Check cache first
      const cacheKey = `item_${id}`;
      const cachedItem = this.getFromCache(cacheKey);
      
      if (cachedItem) {
        console.log('Retrieved item from cache:', id);
        return cachedItem;
      }
      
      // If not in cache, fetch from API
      console.log('Item not in cache, fetching from API');
      const item = await this.http.get<Appraisal>(`${this.apiUrl}/${id}`).toPromise();
      
      // Store in cache
      if (item) {
        this.saveToCache(cacheKey, item);
      }
      
      console.log('Received item:', item);
      return item;
    } catch (error) {
      console.error('Error fetching item by ID:', id, error);
      
      // Try a fallback approach - check if the item exists in the published items
      try {
        console.log('Attempting fallback - checking published items');
        const publishedItems = await this.getShowcaseItems();
        const matchingItem = publishedItems?.find((item: Appraisal) => item._id === id);
        
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
      id: id,
      name: 'Error Loading Item',
      title: 'Error Loading Item',
      description: errorMessage,
      category: 'Unknown',
      condition: 'Unknown',
      estimatedValue: 'N/A',
      valueRange: { min: 'N/A', max: 'N/A' },
      confidence: 0,
      imageUrl: placeholderImage,
      createdAt: new Date().toISOString(),
      sources: [],
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
    // Clear cache for this item when deleting
    this.clearCacheForItem(id);
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Clears the entire cache
   */
  clearCache(): void {
    console.log('Clearing entire showcase cache');
    this.cache.clear();
  }
  
  /**
   * Clears cache entries related to a specific item
   * @param itemId The ID of the item to clear from cache
   */
  clearCacheForItem(itemId: string): void {
    console.log(`Clearing cache for item: ${itemId}`);
    
    // Clear specific item cache
    const itemCacheKey = `item_${itemId}`;
    this.cache.delete(itemCacheKey);
    
    // Clear showcase items cache to ensure list views are refreshed
    this.cache.delete('showcase_items');
    
    // Clear any user items caches that might contain this item
    // This is a more aggressive approach, but ensures consistency
    const userCacheKeyPattern = 'user_items_';
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(userCacheKeyPattern)) {
        this.cache.delete(key);
      }
    }
    
    console.log('Cache clearing complete');
  }

  // Helper methods for cache
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private saveToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
} 