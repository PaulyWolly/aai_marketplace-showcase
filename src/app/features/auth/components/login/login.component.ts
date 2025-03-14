import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error: string | null = null;
  hidePassword = true;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnRole();
    }

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]] // Removed minLength to allow shorter passwords
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const { email, password } = this.loginForm.value;
    console.log('Attempting login with:', email);
    console.log('Password length:', password.length);

    // Trim whitespace from credentials
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    this.authService.login(trimmedEmail, trimmedPassword)
      .subscribe({
        next: (user) => {
          console.log('Login response received');
          console.log('User role:', user?.role);
          console.log('Token present:', !!user?.token);
          
          // Ensure we have a token before navigating
          if (user && user.token) {
            console.log('Login successful, navigating to dashboard');
            this.redirectBasedOnRole();
          } else {
            console.error('No token in response');
            this.error = 'Login failed: No authentication token received';
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Login error:', error);
          
          // More detailed error handling
          if (error.status === 401) {
            this.error = 'Invalid email or password';
          } else if (error.status === 0) {
            this.error = 'Cannot connect to server. Please check your internet connection.';
          } else {
            this.error = error.error?.message || 'An unexpected error occurred';
          }
          
          this.loading = false;
        }
      });
  }

  private redirectBasedOnRole(): void {
    // Redirect based on user role
    if (this.authService.isAdmin()) {
      console.log('User is admin, redirecting to admin dashboard');
      this.router.navigate(['/admin']);
    } else {
      console.log('User is not admin, redirecting to showcase');
      this.router.navigate(['/showcase']);
    }
  }
}
