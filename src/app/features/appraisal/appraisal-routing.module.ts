import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { AppraisalCaptureComponent } from './components/appraisal-capture/appraisal-capture.component';
import { AppraisalResultsComponent } from './components/appraisal-results/appraisal-results.component';
import { AppraisalHistoryComponent } from './components/appraisal-history/appraisal-history.component';
import { WebAppraisalComponent } from './components/web-appraisal/web-appraisal.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'capture', pathMatch: 'full' },
      { 
        path: 'capture',
        component: AppraisalCaptureComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'results',
        component: AppraisalResultsComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'history',
        component: AppraisalHistoryComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'view/:id',
        component: AppraisalResultsComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'web',
        component: WebAppraisalComponent,
        canActivate: [AuthGuard],
        data: { title: 'Web Appraisal' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppraisalRoutingModule { } 