import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebcamModule } from 'ngx-webcam';
import { SharedModule } from '../../shared/shared.module';
import { AppraisalRoutingModule } from './appraisal-routing.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule } from '@angular/material/snack-bar';

// Components
import { AppraisalResultsComponent } from './components/appraisal-results/appraisal-results.component';
import { AppraisalHistoryComponent } from './components/appraisal-history/appraisal-history.component';
import { AppraisalCaptureComponent } from './components/appraisal-capture/appraisal-capture.component';
import { WebAppraisalComponent } from './components/web-appraisal/web-appraisal.component';

// Services
import { WebAppraisalService } from './services/web-appraisal.service';
import { AppraisalService } from './services/appraisal.service';

// Other
import { MarkdownModule } from 'ngx-markdown';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AppraisalCaptureComponent,
    AppraisalResultsComponent,
    AppraisalHistoryComponent,
    WebAppraisalComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    WebcamModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    
    // Material modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatSnackBarModule,
    
    // Routing and other modules
    AppraisalRoutingModule,
    MarkdownModule.forChild(),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [
    WebAppraisalComponent
  ],
  providers: [
    WebAppraisalService,
    AppraisalService
  ]
})
export class AppraisalModule { } 