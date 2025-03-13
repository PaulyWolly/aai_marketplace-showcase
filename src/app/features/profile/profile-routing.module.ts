import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './components/profile/profile.component';
import { MemberItemsComponent } from './components/member-items/member-items.component';
import { MemberItemFormComponent } from './components/member-item-form/member-item-form.component';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'items',
    component: MemberItemsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'items/new',
    component: MemberItemFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'items/edit/:id',
    component: MemberItemFormComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { } 