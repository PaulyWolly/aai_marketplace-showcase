import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ItemService } from '../../../../core/services/item.service';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { AuthService } from '../../../../core/services/auth.service';
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appraisalService: AppraisalService,
    private itemService: ItemService,
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
      let appraisals: Appraisal[] = [];
      
      if (this.userItemsOnly && this.userId) {
        // Load specific user's items
        console.log(`Loading items for user ID: ${this.userId}`);
        try {
          appraisals = await this.appraisalService.getUserAppraisals(this.userId) || [];
          console.log(`Loaded ${appraisals.length} items for user ${this.userId}`);
          
          if (!this.userName) {
            // If userName is not provided, fetch user details
            this.authService.getUserById(this.userId).subscribe(user => {
              if (user) {
                this.userName = `${user.firstName} ${user.lastName}`;
                
                // Update the data source with user name
                const appraisalsWithUser: AppraisalWithUser[] = appraisals.map(appraisal => ({
                  ...appraisal,
                  userName: this.userName || 'Unknown User'
                }));
                
                this.dataSource.data = appraisalsWithUser;
              }
            }, error => {
              console.error('Error fetching user details:', error);
              // Still show items even if user details can't be fetched
              this.dataSource.data = appraisals.map(appraisal => ({
                ...appraisal,
                userName: 'Unknown User'
              }));
            });
          } else {
            // If userName is provided, use it directly
            const appraisalsWithUser: AppraisalWithUser[] = appraisals.map(appraisal => ({
              ...appraisal,
              userName: this.userName || 'Unknown User'
            }));
            
            this.dataSource.data = appraisalsWithUser;
          }
        } catch (error) {
          console.error(`Error loading items for user ${this.userId}:`, error);
          this.error = `Failed to load items for this user.`;
          this.dataSource.data = [];
        }
      } else if (this.userItemsOnly) {
        // Load current user's items
        console.log('Loading current user\'s items');
        try {
          appraisals = await this.appraisalService.getUserAppraisals() || [];
          console.log(`Loaded ${appraisals.length} items for current user`);
          this.dataSource.data = appraisals;
        } catch (error) {
          console.error('Error loading current user items:', error);
          this.error = 'Failed to load your items.';
          this.dataSource.data = [];
        }
      } else {
        // Load all items (admin view) with user information
        console.log('Loading all items');
        try {
          appraisals = await this.appraisalService.getAllAppraisals() || [];
          console.log(`Loaded ${appraisals.length} items total`);
          
          // Get all users to match with items
          this.authService.getAllUsers().subscribe(
            users => {
              const userMap = new Map(users.map(user => [
                user._id, 
                { name: `${user.firstName} ${user.lastName}`, email: user.email }
              ]));
              
              // Add user info to each appraisal
              const appraisalsWithUser: AppraisalWithUser[] = appraisals.map(appraisal => ({
                ...appraisal,
                userName: userMap.get(appraisal.userId || '')?.name || 'Unknown User',
                userEmail: userMap.get(appraisal.userId || '')?.email || 'Unknown'
              }));
              
              this.dataSource.data = appraisalsWithUser;
            },
            error => {
              console.error('Error fetching users:', error);
              // Still show items even if user details can't be fetched
              this.dataSource.data = appraisals.map(appraisal => ({
                ...appraisal,
                userName: 'Unknown User',
                userEmail: 'Unknown'
              }));
            }
          );
        } catch (error) {
          console.error('Error loading all items:', error);
          this.error = 'Failed to load items. The API endpoint may not be available.';
          this.dataSource.data = [];
        }
      }
    } catch (err) {
      console.error('Error loading items:', err);
      this.error = 'Failed to load items.';
      this.dataSource.data = [];
    } finally {
      this.loading = false;
    }
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
}
