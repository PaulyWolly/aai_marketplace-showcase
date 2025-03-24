import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-member-items',
  templateUrl: './member-items.component.html',
  styleUrls: ['./member-items.component.scss']
})
export class MemberItemsComponent implements OnInit {
  displayedColumns: string[] = ['name', 'category', 'condition', 'estimatedValue', 'timestamp', 'actions'];
  dataSource = new MatTableDataSource<Appraisal>([]);
  loading = true;
  error: string | null = null;
  placeholderImage = 'data:image/png;base64,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';
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private router: Router,
    private appraisalService: AppraisalService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    await this.loadItems();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  async loadItems() {
    try {
      this.loading = true;
      this.appraisalService.getUserAppraisals().subscribe({
        next: (appraisals) => {
          this.dataSource.data = appraisals;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading items:', err);
          this.error = 'Failed to load items.';
          this.loading = false;
        }
      });
    } catch (err) {
      console.error('Error loading items:', err);
      this.error = 'Failed to load items.';
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
    this.router.navigate(['/profile/items/edit', id]);
  }

  viewInShowcase(item: Appraisal) {
    if (!item._id) return;
    
    // Navigate to the showcase item view
    this.router.navigate(['/showcase/item', item._id]);
  }

  async togglePublished(item: Appraisal) {
    if (!item._id) return;
    
    try {
      this.appraisalService.togglePublished(item._id, !item.isPublished).subscribe({
        next: (updatedItem) => {
          // Update the local item
          item.isPublished = !item.isPublished;
          
          this.snackBar.open(
            item.isPublished 
              ? 'Item published to showcase' 
              : 'Item removed from showcase', 
            'Close', 
            { duration: 3000 }
          );
        },
        error: (err) => {
          console.error('Error toggling published status:', err);
          this.error = 'Failed to update item status.';
        }
      });
    } catch (err) {
      console.error('Error toggling published status:', err);
      this.error = 'Failed to update item status.';
    }
  }

  async deleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await this.appraisalService.deleteAppraisal(id);
      this.snackBar.open('Item deleted successfully', 'Close', { duration: 3000 });
      await this.loadItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      this.snackBar.open('Failed to delete item', 'Close', { duration: 3000 });
    }
  }

  addNewItem() {
    this.router.navigate(['/profile/items/new']);
  }

  appraiseNewItem() {
    this.router.navigate(['/appraisal/capture']);
  }

  // Create a method to handle image loading errors
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.placeholderImage;
    }
  }
} 