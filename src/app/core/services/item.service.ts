import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Seller {
  _id: string;
  name: string;
  rating: number;
  email: string;
}

export interface Item {
  _id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
  seller: Seller;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ItemCreateData {
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  condition: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private apiUrl = `${environment.apiUrl}/items`;

  constructor(private http: HttpClient) {
    console.log('ItemService initialized with API URL:', this.apiUrl);
  }

  getItems(page: number = 0, pageSize: number = 10, category?: string, sortBy?: string, searchText?: string): Observable<ItemsResponse> {
    let url = `${this.apiUrl}?page=${page}&pageSize=${pageSize}`;
    if (category) url += `&category=${category}`;
    if (sortBy) url += `&sortBy=${sortBy}`;
    if (searchText) url += `&search=${searchText}`;
    
    console.log('Getting items from:', url);
    return this.http.get<ItemsResponse>(url).pipe(
      tap(response => {
        console.log('Received items:', response);
      }),
      catchError(this.handleError)
    );
  }

  getItemById(id: string): Observable<Item> {
    console.log('Getting item by id:', id);
    return this.http.get<Item>(`${this.apiUrl}/${id}`).pipe(
      tap(item => {
        console.log('Received item:', item);
      }),
      catchError(this.handleError)
    );
  }

  createItem(item: Partial<Item>): Observable<Item> {
    console.log('Creating item:', item);
    return this.http.post<Item>(this.apiUrl, item).pipe(
      tap(createdItem => {
        console.log('Created item:', createdItem);
      }),
      catchError(this.handleError)
    );
  }

  updateItem(id: string, item: Partial<Item>): Observable<Item> {
    console.log('Updating item:', id, item);
    return this.http.put<Item>(`${this.apiUrl}/${id}`, item).pipe(
      tap(updatedItem => {
        console.log('Updated item:', updatedItem);
      }),
      catchError(this.handleError)
    );
  }

  deleteItem(id: string): Observable<void> {
    console.log('Deleting item:', id);
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        console.log('Deleted item:', id);
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }
} 