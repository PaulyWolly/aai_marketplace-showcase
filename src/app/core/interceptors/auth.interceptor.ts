import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    console.log('AuthInterceptor: Request URL:', request.url);
    console.log('AuthInterceptor: Token present:', !!token);

    if (token) {
      request = request.clone({
        setHeaders: {
          'x-auth-token': token
        }
      });
      console.log('AuthInterceptor: Added token to request headers');
    } else {
      console.log('AuthInterceptor: No token available to add to request');
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('AuthInterceptor: Caught error:', error.status, error.message);
        
        // Only log out on 401 errors for authentication-related endpoints
        if (error.status === 401) {
          // Check if this is an auth endpoint or a protected endpoint
          const url = error.url || '';
          const isAuthEndpoint = url.includes('/api/auth/');
          
          // Don't log out for initial data loading errors
          if (isAuthEndpoint) {
            console.log('AuthInterceptor: 401 error on auth endpoint, logging out user');
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          } else {
            console.log('AuthInterceptor: 401 error on non-auth endpoint, not logging out');
            // Just report the error without logging out
          }
        }
        return throwError(() => error);
      })
    );
  }
} 