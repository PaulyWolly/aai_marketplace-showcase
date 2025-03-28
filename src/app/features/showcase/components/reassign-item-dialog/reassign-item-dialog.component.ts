import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from '../../../../core/services/auth.service';
import { ShowcaseService } from '../../services/showcase.service';

@Component({
  selector: 'app-reassign-item-dialog',
  template: `
    <h2 mat-dialog-title>Reassign Item</h2>
    <mat-dialog-content>
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
      
      <div *ngIf="error" class="error-message">
        <mat-error>{{error}}</mat-error>
      </div>

      <div *ngIf="!loading">
        <p>Select a user to reassign the item: <strong>{{data.item.name}}</strong></p>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Select User</mat-label>
          <mat-select [(ngModel)]="selectedUserId">
            <mat-option *ngFor="let user of users" [value]="user._id">
              {{user.firstName}} {{user.lastName}} ({{user.email}})
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="!selectedUserId || loading"
              (click)="onConfirm()">
        Reassign
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 20px;
    }
    .error-message {
      color: red;
      margin: 10px 0;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class ReassignItemDialogComponent implements OnInit {
  users: any[] = [];
  selectedUserId: string | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<ReassignItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: any },
    private authService: AuthService,
    private showcaseService: ShowcaseService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    try {
      this.loading = true;
      const users = await this.authService.getAllUsers().toPromise();
      this.users = users || [];
      // Remove the current user of the item if it exists
      if (this.data.item.userId) {
        this.users = this.users.filter(user => user._id !== this.data.item.userId);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.error = 'Failed to load users';
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onConfirm() {
    if (!this.selectedUserId) return;
    
    try {
      this.loading = true;
      await this.showcaseService.reassignItem(this.data.item._id, this.selectedUserId).toPromise();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error reassigning item:', error);
      this.error = 'Failed to reassign item';
      this.loading = false;
    }
  }
} 