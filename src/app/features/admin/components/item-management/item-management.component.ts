import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

// Extended interface to include user information
interface AppraisalWithUser extends Appraisal {
  userName?: string;
  userEmail?: string;
}

@Component({
  selector: 'app-item-management',
  templateUrl: './item-management.component.html',
  styleUrls: ['./item-management.component.scss']
})
export class ItemManagementComponent implements OnInit {
  @Input() userItemsOnly: boolean = true;
  @Input() userId: string | null = null;
  @Input() userName: string | null = null;
  
  displayedColumns: string[] = ['name', 'category', 'condition', 'estimatedValue', 'timestamp', 'actions'];
  dataSource = new MatTableDataSource<AppraisalWithUser>([]);
  loading = true;
  error: string | null = null;
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  users: User[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appraisalService: AppraisalService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    // If userId is not provided as an input, check the route params
    if (!this.userId) {
      this.route.queryParams.subscribe(params => {
        this.userId = params['userId'] || null;
        
        // If we're showing items for a specific user, add the user column
        if (this.userId) {
          if (!this.displayedColumns.includes('userName')) {
            this.displayedColumns = ['userName', ...this.displayedColumns];
          }
        } else if (!this.userItemsOnly) {
          // If we're showing all items (admin view), add the user column
          if (!this.displayedColumns.includes('userName')) {
            this.displayedColumns = ['userName', ...this.displayedColumns];
          }
        } else {
          // Remove user column if we're only showing current user's items
          this.displayedColumns = this.displayedColumns.filter(col => col !== 'userName');
        }
        
        this.loadItems();
      });
    } else {
      // If userId is provided as an input, load items directly
      this.loadItems();
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  async loadItems() {
    try {
      this.loading = true;
      this.error = null;
      
      // Reset the data source
      this.dataSource.data = [];
      
      // Load users for mapping
      await this.loadUsers();
      
      if (this.userItemsOnly && this.userId) {
        // Load specific user's items
        console.log(`Loading items for user ID: ${this.userId}`);
        this.appraisalService.getUserAppraisals(this.userId).subscribe({
          next: (appraisals) => {
            console.log(`Loaded ${appraisals.length} items for user ${this.userId}`);
            
            if (!this.userName) {
              // If userName is not provided, fetch user details
              const user = this.users.find(u => u._id === this.userId);
              if (user) {
                this.userName = `${user.firstName} ${user.lastName}`;
              }
            }
            
            this.processAppraisals(appraisals);
          },
          error: (err) => {
            console.error(`Error loading items for user ${this.userId}:`, err);
            this.error = `Failed to load items for user ${this.userId}`;
            this.loading = false;
          }
        });
      } else if (this.userItemsOnly) {
        // Load current user's items
        console.log('Loading current user items');
        this.appraisalService.getUserAppraisals().subscribe({
          next: (appraisals) => {
            console.log(`Loaded ${appraisals.length} items for current user`);
            this.processAppraisals(appraisals);
          },
          error: (err) => {
            console.error('Error loading current user items:', err);
            this.error = 'Failed to load your items';
            this.loading = false;
          }
        });
      } else {
        // Load all items (admin only)
        console.log('Loading all items (admin)');
        this.appraisalService.getAllAppraisals().subscribe({
          next: (appraisals) => {
            console.log(`Loaded ${appraisals.length} items total`);
            this.processAppraisals(appraisals);
          },
          error: (err) => {
            console.error('Error loading all items:', err);
            this.error = 'Failed to load items';
            this.loading = false;
          }
        });
      }
    } catch (err) {
      console.error('Error in loadItems:', err);
      this.error = 'An unexpected error occurred while loading items';
      this.loading = false;
    }
  }

  processAppraisals(appraisals: Appraisal[]) {
    // Map user IDs to user info
    const userMap = new Map(this.users.map(user => [user._id, user]));
    
    // Transform appraisals to include user info
    const items = appraisals.map(appraisal => ({
      ...appraisal,
      userName: userMap.get(appraisal.userId || '')
        ? `${userMap.get(appraisal.userId || '')?.firstName || ''} ${userMap.get(appraisal.userId || '')?.lastName || ''}`
        : 'Unknown User',
      userEmail: userMap.get(appraisal.userId || '')?.email || 'Unknown'
    }));
    
    // Update the data source
    this.dataSource.data = items;
    this.loading = false;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  editItem(id: string) {
    // If we're viewing a specific user's items, include a return URL
    if (this.userId) {
      const returnUrl = `/admin?selectedSection=items&userId=${this.userId}`;
      this.router.navigate(['/admin/items/edit', id], { 
        queryParams: { returnUrl: encodeURIComponent(returnUrl) }
      });
    } else {
      this.router.navigate(['/admin/items/edit', id], {
        queryParams: { returnUrl: encodeURIComponent('/admin?selectedSection=items') }
      });
    }
  }

  async deleteItem(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        try {
          await this.appraisalService.deleteAppraisal(id);
          this.snackBar.open('Item deleted successfully', 'Close', { duration: 3000 });
          await this.loadItems();
        } catch (err) {
          console.error('Error deleting item:', err);
          this.snackBar.open('Failed to delete item', 'Close', { duration: 3000 });
        }
      }
    });
  }

  addNewItem() {
    this.router.navigate(['/admin/items/new']);
  }

  appraiseNewItem() {
    this.router.navigate(['/appraisal/capture']);
  }
  
  viewItemDetails(id: string) {
    this.router.navigate(['/showcase/item', id]);
  }

  async loadUsers() {
    try {
      console.log('ItemManagement - Loading users...');
      const currentUser = this.authService.getCurrentUser();
      console.log('ItemManagement - Current user role:', currentUser?.role);
      console.log('ItemManagement - Current user has token:', !!currentUser?.token);
      
      const users = await this.authService.getAllUsers().toPromise();
      this.users = users || [];
      console.log('ItemManagement - Loaded users for mapping:', this.users.length);
      console.log('ItemManagement - User data:', JSON.stringify(this.users));
    } catch (error: any) {
      console.error('ItemManagement - Error loading users:', error);
      console.error('ItemManagement - Error details:', {
        name: error.name,
        message: error.message,
        status: error.status,
        statusText: error.statusText
      });
      this.error = 'Failed to load user information';
    }
  }
}
