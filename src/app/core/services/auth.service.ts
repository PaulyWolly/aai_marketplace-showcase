import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
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
    console.log('isLoggedIn check:', isLoggedIn, user?.email);
    return isLoggedIn;
  }

  isAdmin(): boolean {
    const user = this.userSubject.value;
    const isAdmin = user?.role === 'admin';
    console.log('isAdmin check:', isAdmin, user?.email, user?.role);
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
    const user = this.userSubject.value;
    const token = user ? user.token : null;
    console.log('getToken called, token exists:', !!token);
    return token;
  }

  // User Management Methods for Admin
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`);
  }

  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${userId}`);
  }

  // Get basic user info (accessible to all authenticated users)
  getBasicUserInfo(userId: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${userId}/basic`);
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