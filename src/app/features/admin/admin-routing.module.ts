import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ItemFormComponent } from './components/item-form/item-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { AdminGuard } from '../../core/guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  { 
    path: 'items/new', 
    component: ItemFormComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  { 
    path: 'items/edit/:id', 
    component: ItemFormComponent,
    canActivate: [AuthGuard, AdminGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { } 