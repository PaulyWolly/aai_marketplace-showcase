import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { WebcamModule } from 'ngx-webcam';

// Material Modules
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Components
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { ImageCaptureDialogComponent } from './components/image-capture-dialog/image-capture-dialog.component';
import { ImageGalleryComponent } from './components/image-gallery/image-gallery.component';

// Pipes
import { MarkdownPipe } from './pipes/markdown.pipe';

@NgModule({
  declarations: [
    MarkdownPipe,
    ImageCaptureDialogComponent,
    ConfirmDialogComponent,
    ImageGalleryComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    // Material Modules
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
    // Other Modules
    MarkdownModule.forChild(),
    WebcamModule
  ],
  exports: [
    // Angular Modules
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    // Material Modules
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
    // Components, Pipes, Other Modules
    MarkdownPipe,
    MarkdownModule,
    WebcamModule,
    ImageGalleryComponent,
    ConfirmDialogComponent,
    ImageCaptureDialogComponent
  ]
})
export class SharedModule { }
