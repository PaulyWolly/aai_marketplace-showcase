import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss']
})
export class ProfileEditComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Populate form with current user data
    this.profileForm.patchValue({
      firstName: this.currentUser.firstName,
      lastName: this.currentUser.lastName,
      email: this.currentUser.email
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // TODO: Implement profile update functionality in AuthService
    // For now, just navigate back to profile view
    this.loading = false;
    this.router.navigate(['/profile']);
  }

  onCancel(): void {
    this.router.navigate(['/profile']);
  }
}
