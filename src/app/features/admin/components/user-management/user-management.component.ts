import { Component, OnInit, ViewChild, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
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
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
export class UserManagementComponent implements OnInit, AfterViewInit {
  @Input() itemManagementMode = false; // Flag to indicate if this component is used for item management
  @Output() memberSelected = new EventEmitter<{ id: string, name: string }>();
  
  displayedColumns: string[] = ['name', 'email', 'role', 'createdAt', 'itemCount', 'actions'];
  dataSource = new MatTableDataSource<UserWithItemCount>([]);
  loading = true;
  error: string | null = null;
  userItemCounts = new Map<string, number>();
  
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
    this.dataSource.data = []; // Clear existing data

    const currentUser = this.authService.getCurrentUser();
    console.log('UserManagement - Loading users with role:', currentUser?.role);
    console.log('UserManagement - Current user details:', JSON.stringify(currentUser));
    console.log('UserManagement - AuthService token:', this.authService.getToken());

    // Debug token and authorization
    const token = this.authService.getToken();
    console.log('UserManagement - Token available:', !!token);
    if (token) {
      console.log('UserManagement - Token length:', token.length);
      console.log('UserManagement - Token first 10 chars:', token.substring(0, 10) + '...');
      console.log('UserManagement - Auth header would be:', `Bearer ${token.substring(0, 10)}...`);
    } 

    this.authService.getAllUsers().subscribe({
      next: (users) => {
        console.log('UserManagement - Users loaded:', users?.length || 0);
        console.log('UserManagement - RAW user data:', JSON.stringify(users));
        if (!users || users.length === 0) {
          this.error = 'No members found in the database.';
          this.loading = false;
          return;
        }
        
        // Store all users in the property
        this.allUsers = users;
        
        // Set initial data to the data source
        this.dataSource.data = this.allUsers;
        
        // Get accurate item counts for each user
        this.fetchItemCounts(users);
      },
      error: (err) => {
        console.error('UserManagement - Error loading users:', {
          status: err.status,
          message: err.message,
          error: err.error
        });
        
        // Try to extract and log network details
        try {
          console.error('UserManagement - Request URL:', err.url);
          console.error('UserManagement - Request headers:', err.headers);
          console.error('UserManagement - Error type:', err.name);
          console.error('UserManagement - Full error object:', JSON.stringify(err));
        } catch (e) {
          console.error('Could not stringify error:', e);
        }
        
        if (err.status === 401) {
          this.error = 'Your session has expired. Please log in again.';
          this.router.navigate(['/auth/login']);
        } else if (err.status === 403) {
          this.error = 'You do not have permission to view users.';
        } else {
          this.error = 'Failed to load users. Please try again.';
        }
        
        this.loading = false;
      }
    });
  }

  async fetchItemCounts(users: User[]) {
    try {
      console.log('UserManagement - Fetching item counts for users:', users.length);
      
      // Create an array of promises for each user's items
      const itemCountPromises = users.map(user => {
        return new Promise<{userId: string, count: number}>((resolve) => {
          this.appraisalService.getUserAppraisals(user._id).subscribe({
            next: (items) => {
              console.log(`UserManagement - User ${user._id} has ${items?.length || 0} items`);
              resolve({ userId: user._id, count: items?.length || 0 });
            },
            error: (error) => {
              console.error(`UserManagement - Error fetching items for user ${user._id}:`, error);
              resolve({ userId: user._id, count: 0 });
            }
          });
        });
      });
      
      // Wait for all promises to resolve
      const itemCounts = await Promise.all(itemCountPromises);
      
      // Update the user data with item counts
      this.userItemCounts = new Map(itemCounts.map(result => [result.userId, result.count]));
      
      // Update the data source
      this.updateDataSource();
      
      console.log('UserManagement - Successfully loaded all user data and item counts');
    } catch (error) {
      console.error('UserManagement - Error in fetchItemCounts:', error);
      this.error = 'Error loading item counts';
      this.loading = false;
    }
  }

  viewUserItems(userId: string, user: User) {
    if (this.itemManagementMode) {
      // In item management mode, emit the selected member
      this.memberSelected.emit({
        id: userId,
        name: `${user.firstName} ${user.lastName}`
      });
    } else {
      // In regular mode, navigate to the user showcase page
      this.router.navigate(['/showcase/user', userId]);
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
  resetUserPassword(user: User) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { 
        title: 'Reset Password', 
        message: `Are you sure you want to reset the password for ${user.firstName} ${user.lastName}?`,
        confirmText: 'Yes, Reset Password',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.http.post(`${environment.apiUrl}/admin/reset-password`, { userId: user._id }).subscribe({
          next: (response: any) => {
            this.loading = false;
            
            // Show dialog with new password
            this.dialog.open(ConfirmDialogComponent, {
              width: '400px',
              data: { 
                title: 'Password Reset', 
                message: `Password for ${user.firstName} ${user.lastName} has been reset.<br><br>
                         <strong>New Password:</strong> ${response.newPassword}<br><br>
                         Please save this password or share it with the user.`,
                confirmText: 'Done',
                hideCancel: true
              }
            });
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

  createAdminUser() {
    const dialogRef = this.dialog.open(CreateAdminDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        
        this.http.post(`${environment.apiUrl}/admin/create-admin`, result).subscribe({
          next: (response: any) => {
            console.log('Admin user created:', response);
            this.snackBar.open('Admin user created successfully', 'Close', { duration: 3000 });
            this.loadUsers(); // Reload the user list
          },
          error: (error) => {
            console.error('Error creating admin user:', error);
            this.snackBar.open('Failed to create admin user', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      }
    });
  }

  updateDataSource() {
    try {
      const usersWithCounts = this.allUsers.map(user => {
        return {
          ...user,
          accurateItemCount: this.userItemCounts.get(user._id) || 0
        } as UserWithItemCount;
      });
      
      console.log('UserManagement - Data with counts:', usersWithCounts.length);
      if (usersWithCounts.length > 0) {
        console.log('UserManagement - First user sample:', usersWithCounts[0]);
      }
      
      // Update the data source
      this.dataSource.data = usersWithCounts;
      
      // Make sure we update the paginator after data change
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    } catch (error) {
      console.error('UserManagement - Error updating data source:', error);
    } finally {
      this.loading = false;
    }
  }

  // Add a property to store all users
  private allUsers: User[] = [];
}
