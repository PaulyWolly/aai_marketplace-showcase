import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private config = {
    worthpoint: {
      apiKey: environment.externalApis?.worthpoint?.apiKey || '',
      apiUrl: 'https://api.worthpoint.com/v1',
      enabled: environment.externalApis?.worthpoint?.enabled ?? false
    },
    // Add other provider configurations here
  };

  getConfig(provider: 'worthpoint'): any {
    return this.config[provider];
  }

  isProviderEnabled(provider: 'worthpoint'): boolean {
    return this.config[provider]?.enabled && !!this.config[provider]?.apiKey;
  }
} 