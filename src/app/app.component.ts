import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isMenuExpanded = true;

  constructor(
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Check authentication state on init
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (!isAuthenticated) {
        this.isMenuExpanded = false;
      }
    });
  }

  ngAfterViewInit() {
    // Force change detection to ensure sidenav is properly initialized
    this.cdr.detectChanges();
  }

  onMenuClick() {
    this.isMenuExpanded = !this.isMenuExpanded;
    
    // Force the sidenav to update its width
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }
}
