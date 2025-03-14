import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppraisalService, Appraisal } from '../../../appraisal/services/appraisal.service';

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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private router: Router,
    private appraisalService: AppraisalService,
    private snackBar: MatSnackBar
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
      const appraisals = await this.appraisalService.getUserAppraisals() || [];
      this.dataSource.data = appraisals;
    } catch (err) {
      console.error('Error loading items:', err);
      this.error = 'Failed to load items.';
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
    this.router.navigate(['/profile/items/edit', id]);
  }

  async togglePublished(item: Appraisal) {
    if (!item._id) return;
    
    try {
      await this.appraisalService.togglePublished(item._id, !item.isPublished);
      
      // Update the local item
      item.isPublished = !item.isPublished;
      
      this.snackBar.open(
        item.isPublished 
          ? 'Item published to showcase' 
          : 'Item removed from showcase', 
        'Close', 
        { duration: 3000 }
      );
    } catch (err) {
      console.error('Error toggling published status:', err);
      this.snackBar.open('Failed to update showcase status', 'Close', { duration: 3000 });
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
} 