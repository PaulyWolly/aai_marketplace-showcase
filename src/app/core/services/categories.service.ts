import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private _categories = [
    'Electronics',
    'Clothing',
    'Books',
    'Home & Garden',
    'Sports & Outdoors',
    'Toys & Games',
    'Jewelry',
    'Art',
    'Collectibles',
    'Vehicles',
    'Other'
  ];

  private _conditions = [
    'New',
    'Like New',
    'Very Good',
    'Good',
    'Fair',
    'Poor'
  ];

  constructor() { }

  get categories(): string[] {
    return [...this._categories];
  }

  get conditions(): string[] {
    return [...this._conditions];
  }
} 