import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { User } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-user-edit-dialog',
  templateUrl: './user-edit-dialog.component.html',
  styleUrls: ['./user-edit-dialog.component.scss']
})
export class UserEditDialogComponent implements OnInit {
  userForm: FormGroup;
  loading = false;
  error: string | null = null;
  roles = ['user', 'admin'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User
  ) {
    this.userForm = this.fb.group({
      firstName: [data.firstName, [Validators.required]],
      lastName: [data.lastName, [Validators.required]],
      email: [data.email, [Validators.required, Validators.email]],
      role: [data.role, [Validators.required]]
    });
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }

    const updatedUser = {
      ...this.data,
      ...this.userForm.value
    };

    this.dialogRef.close(updatedUser);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
} 