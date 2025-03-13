import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log('AuthGuard: Checking if user is logged in');
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('AuthGuard: User is logged in:', isLoggedIn);
    
    if (isLoggedIn) {
      return true;
    }

    console.log('AuthGuard: User is not logged in, redirecting to login');
    // Store the attempted URL for redirecting
    // this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url }});
    this.router.navigate(['/auth/login']);
    return false;
  }
} 