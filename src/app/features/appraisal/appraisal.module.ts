import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebcamModule } from 'ngx-webcam';
import { SharedModule } from '../../shared/shared.module';
import { AppraisalRoutingModule } from './appraisal-routing.module';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MarkdownModule } from 'ngx-markdown';
import { AppraisalResultsComponent } from './components/appraisal-results/appraisal-results.component';
import { AppraisalHistoryComponent } from './components/appraisal-history/appraisal-history.component';
import { AppraisalCaptureComponent } from './components/appraisal-capture/appraisal-capture.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@NgModule({
  declarations: [
    AppraisalCaptureComponent,
    AppraisalResultsComponent,
    AppraisalHistoryComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    WebcamModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AppraisalRoutingModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MarkdownModule.forChild()
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppraisalModule { } 