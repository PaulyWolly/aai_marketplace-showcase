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
    const currentUser = this.authService.getCurrentUser();
    
    console.log('AuthInterceptor - Request Details:', {
      url: request.url,
      method: request.method,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      userRole: currentUser?.role,
      headers: request.headers.keys()
    });

    let clonedRequest = request;
    
    if (token) {
      // Clone the request and add the token
      clonedRequest = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('AuthInterceptor - Added Authorization header');
      console.log('AuthInterceptor - Final headers:', clonedRequest.headers.keys());
    } else {
      console.warn('AuthInterceptor - No token available for request:', request.url);
    }
    
    // Always return the cloned request
    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        this.logErrorDetails(error, clonedRequest);
        
        if (error.status === 401) {
          const url = error.url || '';
          const isAuthEndpoint = url.includes('/api/auth/');
          
          if (!isAuthEndpoint) {
            console.error('AuthInterceptor - Unauthorized access, logging out');
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
        return throwError(() => error);
      })
    );
  }
  
  private logErrorDetails(error: HttpErrorResponse, request: HttpRequest<unknown>) {
    console.error('AuthInterceptor - Error Response:', {
      url: request.url,
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      error: error.error
    });
    
    if (error.status === 0) {
      console.error('AuthInterceptor - Network error - Backend server may be down or unreachable');
    } else if (error.status === 401) {
      console.error('AuthInterceptor - Unauthorized error - Token may be invalid or expired');
    } else if (error.status === 403) {
      console.error('AuthInterceptor - Forbidden error - User may not have required permissions');
    }
  }
} 