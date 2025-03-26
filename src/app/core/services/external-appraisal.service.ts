import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ExternalAppraisalResult {
  estimatedValue: number;
  confidence: number;
  similarItems?: Array<{
    title: string;
    price: number;
    soldDate: string;
    source: string;
    imageUrl?: string;
  }>;
  marketAnalysis?: string;
  provider: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExternalAppraisalService {
  private readonly apiUrl = `${environment.apiUrl}/external-appraisals`;
  
  constructor(private http: HttpClient) {}

  /**
   * Get an appraisal from Worthpoint API
   * @param itemDetails Object containing item details
   * @returns Observable of the appraisal result
   */
  getWorthpointAppraisal(itemDetails: {
    name: string;
    category: string;
    description: string;
    images: string[];
  }): Observable<ExternalAppraisalResult> {
    return this.http.post<ExternalAppraisalResult>(
      `${this.apiUrl}/worthpoint`,
      itemDetails,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      }
    ).pipe(
      map(response => ({
        ...response,
        provider: 'Worthpoint'
      })),
      catchError(error => {
        console.error('Worthpoint API error:', error);
        return throwError(() => new Error('Failed to get Worthpoint appraisal. Please try again later.'));
      })
    );
  }

  /**
   * Get market analysis for an item
   * @param itemDetails Object containing item details
   * @returns Observable of the market analysis
   */
  getMarketAnalysis(itemDetails: {
    name: string;
    category: string;
    description: string;
  }): Observable<string> {
    return this.http.post<{ analysis: string }>(
      `${this.apiUrl}/market-analysis`,
      itemDetails
    ).pipe(
      map(response => response.analysis),
      catchError(error => {
        console.error('Market analysis error:', error);
        return throwError(() => new Error('Failed to get market analysis. Please try again later.'));
      })
    );
  }
} 