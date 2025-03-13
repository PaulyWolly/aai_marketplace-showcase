import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  get currentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
} 