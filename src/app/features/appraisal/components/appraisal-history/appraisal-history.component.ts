import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppraisalService, Appraisal } from '../../services/appraisal.service';

@Component({
  selector: 'app-appraisal-history',
  templateUrl: './appraisal-history.component.html',
  styleUrls: ['./appraisal-history.component.scss']
})
export class AppraisalHistoryComponent implements OnInit {
  appraisals: Appraisal[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private router: Router,
    private appraisalService: AppraisalService
  ) {}

  async ngOnInit() {
    await this.loadAppraisals();
  }

  async loadAppraisals() {
    try {
      this.loading = true;
      const data = await this.appraisalService.fetchUserAppraisals();
      if (data) {
        // Sort by timestamp (newest first)
        this.appraisals = data.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
      } else {
        this.appraisals = [];
      }
    } catch (err) {
      console.error('Error loading appraisals:', err);
      this.error = 'Failed to load appraisals.';
    } finally {
      this.loading = false;
    }
  }

  viewAppraisal(id: string) {
    this.router.navigate(['/appraisal/view', id]);
  }

  async deleteAppraisal(id: string) {
    if (!confirm('Are you sure you want to delete this appraisal?')) return;

    try {
      await this.appraisalService.deleteAppraisal(id);
      await this.loadAppraisals();
    } catch (err) {
      console.error('Error deleting appraisal:', err);
      this.error = 'Failed to delete appraisal.';
    }
  }

  newAppraisal() {
    this.router.navigate(['/appraisal/capture']);
  }
} 