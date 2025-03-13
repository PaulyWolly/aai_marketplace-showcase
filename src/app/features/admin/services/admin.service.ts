import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../../../core/services/auth.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      catchError(error => {
        console.error('Error fetching users:', error);
        return throwError(() => new Error('Failed to load users'));
      })
    );
  }

  updateUser(userId: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}`, userData).pipe(
      catchError(error => {
        console.error('Error updating user:', error);
        return throwError(() => new Error('Failed to update user'));
      })
    );
  }
} 