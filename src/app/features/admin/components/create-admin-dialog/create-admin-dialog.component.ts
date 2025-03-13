import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-create-admin-dialog',
  templateUrl: './create-admin-dialog.component.html',
  styleUrls: ['./create-admin-dialog.component.scss']
})
export class CreateAdminDialogComponent implements OnInit {
  adminForm: FormGroup;
  loading = false;
  error: string | null = null;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateAdminDialogComponent>,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.adminForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (this.adminForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.http.post(`${environment.apiUrl}/admin/create-admin`, this.adminForm.value)
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          this.snackBar.open('Admin user created successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(response.user);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error creating admin user:', error);
          this.error = error.error?.message || 'Failed to create admin user';
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  generatePassword(): void {
    // Generate a random password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.adminForm.get('password')?.setValue(password);
  }
} 