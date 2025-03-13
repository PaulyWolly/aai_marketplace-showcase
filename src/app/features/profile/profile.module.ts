import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProfileRoutingModule } from './profile-routing.module';
import { SharedModule } from '../../shared/shared.module';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Components
import { ProfileComponent } from './components/profile/profile.component';
import { MemberItemsComponent } from './components/member-items/member-items.component';
import { MemberItemFormComponent } from './components/member-item-form/member-item-form.component';
import { ProfileViewComponent } from './components/profile-view/profile-view.component';
import { ProfileEditComponent } from './components/profile-edit/profile-edit.component';

@NgModule({
  declarations: [
    ProfileComponent,
    MemberItemsComponent,
    MemberItemFormComponent,
    ProfileViewComponent,
    ProfileEditComponent
  ],
  imports: [
    CommonModule,
    ProfileRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProfileModule { }
