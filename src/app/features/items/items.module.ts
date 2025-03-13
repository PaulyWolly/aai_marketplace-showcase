import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';

// Components
import { ItemListComponent } from './components/item-list/item-list.component';
import { ItemDetailComponent } from './components/item-detail/item-detail.component';
import { ItemCreateComponent } from './components/item-create/item-create.component';

const routes: Routes = [
  { path: '', component: ItemListComponent },
  { path: 'create', component: ItemCreateComponent },
  { path: ':id', component: ItemDetailComponent }
];

@NgModule({
  declarations: [
    ItemListComponent,
    ItemDetailComponent,
    ItemCreateComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatTooltipModule
  ]
})
export class ItemsModule { }
