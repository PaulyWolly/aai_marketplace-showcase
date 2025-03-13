import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    console.log('AdminGuard: Checking if user is admin');
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('AdminGuard: User is logged in:', isLoggedIn);
    
    if (!isLoggedIn) {
      console.log('AdminGuard: User is not logged in, redirecting to login');
      this.router.navigate(['/auth/login']);
      return false;
    }
    
    const isAdmin = this.authService.isAdmin();
    console.log('AdminGuard: User is admin:', isAdmin);
    
    if (isAdmin) {
      return true;
    }

    console.log('AdminGuard: User is not admin, redirecting to home');
    this.router.navigate(['/']);
    return false;
  }
} 