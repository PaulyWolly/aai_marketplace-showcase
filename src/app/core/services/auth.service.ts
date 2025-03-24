import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  token: string;
  createdAt?: string;
  itemCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  isAuthenticated$ = this.user$.pipe(
    tap(user => console.log('Auth state changed:', !!user)),
    map(user => !!user)
  );
  isAdmin$ = this.user$.pipe(
    map(user => user?.role === 'admin')
  );

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check for stored user data on initialization
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log('Loaded user from storage:', user.email, 'Role:', user.role);
        this.userSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }
  }

  // Synchronous helper methods for guards and components
  isLoggedIn(): boolean {
    const user = this.userSubject.value;
    const isLoggedIn = !!user;
    console.log('isLoggedIn check:', isLoggedIn, 'User:', user);
    return isLoggedIn;
  }

  isAdmin(): boolean {
    const user = this.userSubject.value;
    const isAdmin = user?.role === 'admin';
    console.log('isAdmin check:', isAdmin, 'User:', user);
    return isAdmin;
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(user => {
          console.log('Login response:', user);
          console.log('User role:', user.role);
          localStorage.setItem('user', JSON.stringify(user));
          this.userSubject.next(user);
        })
      );
  }

  register(userData: { firstName: string; lastName: string; email: string; password: string }): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/auth/register`, userData)
      .pipe(
        tap(user => {
          localStorage.setItem('user', JSON.stringify(user));
          this.userSubject.next(user);
        })
      );
  }

  logout(): void {
    console.log('Logging out user');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    // First try to get token from user object in memory
    const user = this.userSubject.value;
    let token = user ? user.token : null;
    
    // If no token in memory, try getting from localStorage
    if (!token) {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.token) {
            token = parsedUser.token;
            console.log('getToken: Retrieved token from localStorage');
            
            // Update user subject if needed
            if (!this.userSubject.value) {
              console.log('getToken: Updating user subject with stored user');
              this.userSubject.next(parsedUser);
            }
          }
        }
      } catch (error) {
        console.error('getToken: Error retrieving token from localStorage:', error);
      }
    }
    
    console.log('getToken called, token exists:', !!token);
    return token;
  }

  // User Management Methods for Admin
  getAllUsers(): Observable<User[]> {
    const currentUser = this.getCurrentUser();
    console.log('getAllUsers - Current user:', currentUser);
    console.log('getAllUsers - API URL:', `${environment.apiUrl}/users`);
    console.log('getAllUsers - Auth token:', currentUser?.token ? `${currentUser.token.substring(0, 10)}...` : 'none');
    console.log('getAllUsers - Starting API call...');

    return this.http.get<User[]>(`${environment.apiUrl}/users`).pipe(
      tap(users => {
        console.log('getAllUsers - Response received:', !!users);
        console.log('getAllUsers - Response has length:', users?.length);
        console.log('getAllUsers - Response:', users);
      }),
      catchError(error => {
        console.error('getAllUsers - Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          url: error.url,
          headers: error.headers?.keys().map((key: string) => `${key}: ${error.headers?.get(key)}`)
        });
        
        console.error('getAllUsers - Error message:', error.message || 'Unknown error');
        console.error('getAllUsers - Error name:', error.name);
        console.error('getAllUsers - Error type:', typeof error);
        
        if (error.status === 401) {
          console.error('getAllUsers - Authentication error - Token rejected. Logging out...');
          this.logout();
        }
        
        throw error;
      })
    );
  }

  getUserById(userId: string): Observable<User> {
    console.log('Fetching user by ID:', userId);
    return this.http.get<User>(`${environment.apiUrl}/users/${userId}`).pipe(
      tap(user => console.log('Retrieved user:', user))
    );
  }

  getBasicUserInfo(userId: string): Observable<User> {
    console.log('Fetching basic user info for:', userId);
    return this.http.get<User>(`${environment.apiUrl}/users/${userId}/basic`).pipe(
      tap(user => console.log('Retrieved basic user info:', user))
    );
  }

  updateUserRole(userId: string, role: string): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/users/${userId}/role`, { role });
  }

  updateUser(userId: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/users/${userId}`, userData);
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/users/${userId}`);
  }
} 