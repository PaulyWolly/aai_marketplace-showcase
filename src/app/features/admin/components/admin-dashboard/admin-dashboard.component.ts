import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '../../../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CreateAdminDialogComponent } from '../create-admin-dialog/create-admin-dialog.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';

interface MemberSelection {
  id: string;
  name: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  selectedTabIndex = 0;
  selectedSection = 'users'; // Default to users section
  
  // Member selection properties
  selectedMemberId: string | null = null;
  selectedMemberName: string | null = null;

  // Password management properties
  hidePassword = true;
  newAdminPassword = '';
  resetLoading = false;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('AdminDashboard - Initializing component');
    console.log('AdminDashboard - Current user:', this.currentUser);
    
    // Check query params for selected section
    this.route.queryParams.subscribe(params => {
      if (params['selectedSection']) {
        this.selectedSection = params['selectedSection'];
        console.log('AdminDashboard - Selected section from URL:', this.selectedSection);
      }
      
      if (params['userId']) {
        this.selectedMemberId = params['userId'];
        console.log('AdminDashboard - Selected user ID from URL:', this.selectedMemberId);
      }
    });
    
    // Force user section to be selected first to ensure data loads
    setTimeout(() => {
      console.log('AdminDashboard - Forcing section selection:', this.selectedSection);
      this.selectSection(this.selectedSection);
    }, 100);
  }

  get currentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  selectSection(section: string): void {
    console.log('AdminDashboard - Selecting section:', section);
    this.selectedSection = section;
    
    // Update URL to reflect section change (without reloading page)
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { selectedSection: section },
      queryParamsHandling: 'merge'
    });
  }
  
  /**
   * Handle member selection from the user management component
   */
  onMemberSelected(member: MemberSelection): void {
    this.selectedMemberId = member.id;
    this.selectedMemberName = member.name;
  }
  
  /**
   * Clear the selected member to return to the member list
   */
  clearSelectedMember(): void {
    this.selectedMemberId = null;
    this.selectedMemberName = null;
  }

  /**
   * Open the create admin dialog
   */
  createAdminUser(): void {
    const dialogRef = this.dialog.open(CreateAdminDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Admin user created successfully', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Navigate to the user management section
   */
  goToUserManagement(): void {
    this.selectedSection = 'users';
  }

  /**
   * Generate a random password
   */
  generatePassword(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.newAdminPassword = password;
  }

  /**
   * Reset all admin passwords
   */
  resetAllAdminPasswords(): void {
    if (!this.newAdminPassword) {
      this.snackBar.open('Please enter a new password', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Reset All Admin Passwords',
        message: 'Are you sure you want to reset passwords for ALL admin users? This action cannot be undone.',
        confirmText: 'Yes, Reset All',
        cancelText: 'Cancel',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.resetLoading = true;
        this.http.post(`${environment.apiUrl}/admin/reset-all-admin-passwords`, { 
          password: this.newAdminPassword 
        }).subscribe({
          next: (response: any) => {
            this.resetLoading = false;
            this.snackBar.open(`Successfully reset passwords for ${response.count} admin users`, 'Close', { 
              duration: 5000 
            });
            this.newAdminPassword = '';
          },
          error: (error) => {
            this.resetLoading = false;
            console.error('Error resetting admin passwords:', error);
            this.snackBar.open('Failed to reset admin passwords', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
} 