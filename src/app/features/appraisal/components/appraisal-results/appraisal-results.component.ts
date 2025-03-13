import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AppraisalService } from '../../services/appraisal.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

interface AppraisalData {
  timestamp: Date;
  name?: string;
  category?: string;
  condition?: string;
  estimatedValue?: string;
  imageUrl?: string;
  appraisal: {
    details: string;
    marketResearch: string;
  };
}

@Component({
  selector: 'app-appraisal-results',
  templateUrl: './appraisal-results.component.html',
  styleUrls: ['./appraisal-results.component.scss']
})
export class AppraisalResultsComponent implements OnInit {
  appraisalData: AppraisalData | null = null;
  error: string | null = null;
  isSaving = false;
  renderedDetails: SafeHtml | null = null;
  renderedMarketResearch: SafeHtml | null = null;
  showDebug = false;
  debugHtml = {
    details: '',
    marketResearch: ''
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appraisalService: AppraisalService,
    private sanitizer: DomSanitizer
  ) {
    // Configure marked options
    marked.setOptions({
      gfm: true,
      breaks: true,
      pedantic: false,
      smartLists: true,
      smartypants: true
    });

    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.appraisalData = navigation.extras.state['appraisalData'];
      
      // Log the data to check if it's in Markdown format
      if (this.appraisalData) {
        console.log('Appraisal Details:', this.appraisalData.appraisal.details);
        console.log('Market Research:', this.appraisalData.appraisal.marketResearch);
        
        // Render the Markdown content
        this.renderMarkdown();
      }
    }
  }

  ngOnInit() {
    // Check if we're viewing an existing appraisal by ID
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadAppraisalById(id);
      } else if (!this.appraisalData) {
        this.error = 'No appraisal data found. Please try capturing an image again.';
      }
    });
  }

  async loadAppraisalById(id: string) {
    try {
      this.error = null;
      const appraisal = await this.appraisalService.getAppraisalById(id);
      if (appraisal) {
        // Convert to AppraisalData type
        this.appraisalData = {
          timestamp: new Date(appraisal.timestamp || new Date()),
          name: appraisal.name,
          category: appraisal.category,
          condition: appraisal.condition,
          estimatedValue: appraisal.estimatedValue,
          imageUrl: appraisal.imageUrl,
          appraisal: {
            details: appraisal.appraisal?.details || '',
            marketResearch: appraisal.appraisal?.marketResearch || ''
          }
        };
        
        console.log('Loaded appraisal by ID:', this.appraisalData);
        if (this.appraisalData.appraisal?.details) {
          console.log('Appraisal Details:', this.appraisalData.appraisal.details);
        }
        if (this.appraisalData.appraisal?.marketResearch) {
          console.log('Market Research:', this.appraisalData.appraisal.marketResearch);
        }
        this.renderMarkdown();
      } else {
        this.error = 'Appraisal not found.';
      }
    } catch (err) {
      console.error('Error loading appraisal:', err);
      this.error = 'Failed to load appraisal. Please try again.';
    }
  }

  renderMarkdown() {
    if (!this.appraisalData) return;

    try {
      // Render details
      const detailsHtml = marked(this.appraisalData.appraisal.details);
      this.renderedDetails = this.sanitizer.bypassSecurityTrustHtml(detailsHtml);
      this.debugHtml.details = detailsHtml;
      
      // Render market research
      const marketResearchHtml = marked(this.appraisalData.appraisal.marketResearch);
      this.renderedMarketResearch = this.sanitizer.bypassSecurityTrustHtml(marketResearchHtml);
      this.debugHtml.marketResearch = marketResearchHtml;
      
      console.log('Rendered Details HTML:', detailsHtml);
      console.log('Rendered Market Research HTML:', marketResearchHtml);
    } catch (error) {
      console.error('Error rendering Markdown:', error);
      this.error = 'Error rendering content. Please try again.';
    }
  }

  toggleDebug() {
    this.showDebug = !this.showDebug;
  }

  async saveAppraisal() {
    if (!this.appraisalData) return;

    this.isSaving = true;
    try {
      await this.appraisalService.saveAppraisal(this.appraisalData);
      // Show success message or navigate to history
      this.router.navigate(['/appraisal/history']);
    } catch (err) {
      console.error('Error saving appraisal:', err);
      this.error = 'Failed to save appraisal. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }

  newAppraisal() {
    this.router.navigate(['/appraisal/capture']);
  }
} 