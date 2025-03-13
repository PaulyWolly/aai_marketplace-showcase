import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Output() menuClick = new EventEmitter<void>();

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  toggleMenu() {
    this.menuClick.emit();
  }

  logout() {
    console.log('Logging out...');
    this.authService.logout();
    this.router.navigate(['/auth/login']).then(() => {
      console.log('Navigated to login page');
      // Force reload to clear any cached state
      window.location.reload();
    });
  }

  get currentUser() {
    const user = this.authService.getCurrentUser();
    console.log('Current user:', user);
    return user;
  }
}
