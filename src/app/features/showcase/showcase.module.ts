import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';

// Components
import { ShowcaseComponent } from './components/showcase/showcase.component';
import { ItemDetailComponent } from './components/item-detail/item-detail.component';
import { ReassignItemDialogComponent } from './components/reassign-item-dialog/reassign-item-dialog.component';

const routes: Routes = [
  { path: '', component: ShowcaseComponent },
  { path: 'user/:userId', component: ShowcaseComponent },
  { path: 'item/:id', component: ItemDetailComponent }
];

@NgModule({
  declarations: [
    ShowcaseComponent,
    ItemDetailComponent,
    ReassignItemDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    SharedModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDatepickerModule,
    MatDialogModule
  ]
})
export class ShowcaseModule { } 