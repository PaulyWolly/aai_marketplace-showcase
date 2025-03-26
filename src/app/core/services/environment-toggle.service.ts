import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentToggleService {
  private productionMode = new BehaviorSubject<boolean>(false);
  
  constructor() {
    // Try to load saved preference from localStorage
    const savedMode = localStorage.getItem('productionMode');
    if (savedMode !== null) {
      this.productionMode.next(savedMode === 'true');
    }
  }

  /**
   * Get the current production mode state
   */
  isProductionMode(): Observable<boolean> {
    return this.productionMode.asObservable();
  }

  /**
   * Get the current production mode state as a boolean
   */
  isProductionModeSync(): boolean {
    return this.productionMode.value;
  }

  /**
   * Toggle between production and development modes
   * @param enabled Whether to enable production mode
   */
  setProductionMode(enabled: boolean): void {
    this.productionMode.next(enabled);
    localStorage.setItem('productionMode', enabled.toString());
  }
} 