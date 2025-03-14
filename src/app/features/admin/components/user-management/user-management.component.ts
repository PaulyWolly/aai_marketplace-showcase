import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserEditDialogComponent } from '../user-edit-dialog/user-edit-dialog.component';
import { AppraisalService } from '../../../appraisal/services/appraisal.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CreateAdminDialogComponent } from '../create-admin-dialog/create-admin-dialog.component';

// Extended user interface with accurate item count
interface UserWithItemCount extends User {
  accurateItemCount?: number;
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  @Input() itemManagementMode = false; // Flag to indicate if this component is used for item management
  @Output() memberSelected = new EventEmitter<{ id: string, name: string }>();
  
  displayedColumns: string[] = ['name', 'email', 'role', 'createdAt', 'itemCount', 'actions'];
  dataSource = new MatTableDataSource<UserWithItemCount>([]);
  loading = false;
  error: string | null = null;
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private appraisalService: AppraisalService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Adjust columns based on mode
    if (this.itemManagementMode) {
      // In item management mode, we only need name, email, itemCount, and a view items action
      this.displayedColumns = ['name', 'email', 'itemCount', 'actions'];
    }
    
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  loadUsers() {
    this.loading = true;
    this.error = null;

    this.authService.getAllUsers().subscribe({
      next: (users) => {
        // Get accurate item counts for each user
        this.getAccurateItemCounts(users);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error = 'Failed to load users. Please try again later.';
        this.loading = false;
      }
    });
  }

  /**
   * Get accurate item counts for each user by fetching their items
   */
  getAccurateItemCounts(users: User[]) {
    this.loading = true;
    console.log('Fetching item counts for', users.length, 'users');
    
    // Create an array of promises for each user's items
    const itemCountPromises = users.map(user => {
      console.log('Fetching items for user:', user._id);
      return this.appraisalService.getUserAppraisals(user._id)
        .then(items => {
          console.log(`User ${user._id} has ${items ? items.length : 0} items`);
          return { userId: user._id, count: items ? items.length : 0 };
        })
        .catch(error => {
          console.error(`Error fetching items for user ${user._id}:`, error);
          return { userId: user._id, count: 0 };
        });
    });

    // Wait for all promises to resolve
    Promise.all(itemCountPromises)
      .then(results => {
        console.log('Item count results:', results);
        
        // Create a map of user IDs to item counts
        const itemCountMap = new Map(results.map(result => [result.userId, result.count]));
        
        // Update the users with accurate item counts
        const usersWithItemCounts: UserWithItemCount[] = users.map(user => ({
          ...user,
          accurateItemCount: itemCountMap.get(user._id) || 0
        }));
        
        console.log('Users with item counts:', usersWithItemCounts.map(u => ({ 
          id: u._id, 
          name: `${u.firstName} ${u.lastName}`, 
          count: u.accurateItemCount 
        })));
        
        // Update the data source
        this.dataSource.data = usersWithItemCounts;
        this.loading = false;
      })
      .catch(err => {
        console.error('Error getting item counts:', err);
        this.dataSource.data = users;
        this.loading = false;
      });
  }

  viewUserItems(userId: string, user: User) {
    if (this.itemManagementMode) {
      // In item management mode, emit the selected member
      this.memberSelected.emit({
        id: userId,
        name: `${user.firstName} ${user.lastName}`
      });
    } else {
      // In regular mode, navigate to the items page
      this.router.navigate(['/admin/items'], { 
        queryParams: { userId: userId }
      });
    }
  }

  editUser(user: User) {
    const dialogRef = this.dialog.open(UserEditDialogComponent, {
      width: '500px',
      data: user
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.authService.updateUser(user._id, result).subscribe({
          next: () => {
            this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
            this.loadUsers();
          },
          error: (err) => {
            console.error('Error updating user:', err);
            this.snackBar.open('Failed to update user', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      }
    });
  }

  toggleRole(user: User) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const message = user.role === 'admin' 
      ? `Remove admin privileges from ${user.firstName} ${user.lastName}?` 
      : `Make ${user.firstName} ${user.lastName} an admin?`;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { 
        title: 'Change User Role', 
        message,
        confirmText: 'Yes, Change Role',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.authService.updateUserRole(user._id, newRole).subscribe({
          next: () => {
            this.snackBar.open(`User role updated successfully`, 'Close', { duration: 3000 });
            this.loadUsers();
          },
          error: (err) => {
            console.error('Error updating user role:', err);
            this.snackBar.open('Failed to update user role', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      }
    });
  }

  deleteUser(user: User) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { 
        title: 'Delete User', 
        message: `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.authService.deleteUser(user._id).subscribe({
          next: () => {
            this.snackBar.open('User deleted successfully', 'Close', { duration: 3000 });
            this.loadUsers();
          },
          error: (err) => {
            console.error('Error deleting user:', err);
            this.snackBar.open('Failed to delete user', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      }
    });
  }

  // Admin password management functions
  resetUserPassword(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Reset Password',
        message: `Are you sure you want to reset the password for ${user.firstName} ${user.lastName}?`,
        confirmText: 'Reset',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        // Call the backend API to reset the password
        this.http.post(`${environment.apiUrl}/admin/reset-password`, { userId: user._id })
          .subscribe({
            next: (response: any) => {
              this.loading = false;
              this.snackBar.open(`Password reset successfully. New password: ${response.newPassword}`, 'Close', { duration: 5000 });
            },
            error: (error) => {
              this.loading = false;
              console.error('Error resetting password:', error);
              this.snackBar.open('Failed to reset password', 'Close', { duration: 3000 });
            }
          });
      }
    });
  }

  createAdminUser(): void {
    const dialogRef = this.dialog.open(CreateAdminDialogComponent, {
      width: '500px',
      disableClose: true
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Admin user created successfully', 'Close', { duration: 3000 });
        this.loadUsers();
      }
    });
  }
}
