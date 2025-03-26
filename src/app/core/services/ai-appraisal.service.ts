import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIAppraisalResult {
  estimatedValue: number;
  valueRange: {
    min: number;
    max: number;
  };
  confidence: number;
  analysis: {
    condition: string;
    category: string;
    period: string;
    style: string;
    materials: string[];
    features: string[];
  };
  marketAnalysis: string;
  similarItems?: Array<{
    title: string;
    price: number;
    description: string;
    imageUrl?: string;
    source: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AIAppraisalService {
  private readonly apiUrl = `${environment.apiUrl}/ai-appraisal`;

  constructor(private http: HttpClient) {}

  /**
   * Get an AI-powered appraisal for an item
   * @param imageUrls Array of item image URLs
   * @param details Item details including title, category, and description
   */
  getAppraisal(
    imageUrls: string[],
    details: {
      title?: string;
      category?: string;
      description?: string;
      condition?: string;
      dimensions?: {
        height?: number;
        width?: number;
        depth?: number;
        unit: string;
      };
    }
  ): Observable<AIAppraisalResult> {
    const payload = {
      images: imageUrls,
      ...details
    };

    return this.http.post<AIAppraisalResult>(`${this.apiUrl}/analyze`, payload).pipe(
      map(response => this.processResponse(response)),
      catchError(error => {
        console.error('AI Appraisal error:', error);
        return of(this.getEmptyResult());
      })
    );
  }

  /**
   * Process and enhance the AI response
   */
  private processResponse(response: AIAppraisalResult): AIAppraisalResult {
    // Ensure we have valid ranges
    if (!response.valueRange) {
      response.valueRange = {
        min: Math.max(0, response.estimatedValue * 0.8),
        max: response.estimatedValue * 1.2
      };
    }

    // Generate market analysis if not provided
    if (!response.marketAnalysis) {
      response.marketAnalysis = this.generateMarketAnalysis(response);
    }

    return response;
  }

  /**
   * Generate a detailed market analysis
   */
  private generateMarketAnalysis(result: AIAppraisalResult): string {
    let analysis = `Based on AI analysis of the item's images and details, `;
    analysis += `this appears to be a ${result.analysis.condition.toLowerCase()} condition `;
    analysis += `${result.analysis.style.toLowerCase()} piece from the ${result.analysis.period} period. `;
    
    if (result.analysis.materials.length > 0) {
      analysis += `Made primarily of ${result.analysis.materials.join(', ')}. `;
    }

    analysis += `\n\nThe estimated market value is between $${result.valueRange.min.toFixed(2)} `;
    analysis += `and $${result.valueRange.max.toFixed(2)}, `;
    analysis += `with a most likely value of $${result.estimatedValue.toFixed(2)}. `;
    
    if (result.confidence) {
      analysis += `\n\nConfidence in this appraisal is ${result.confidence.toFixed(0)}%. `;
    }

    if (result.similarItems && result.similarItems.length > 0) {
      analysis += `\n\nThis estimate is supported by ${result.similarItems.length} similar items `;
      analysis += `found in our database.`;
    }

    return analysis;
  }

  private getEmptyResult(): AIAppraisalResult {
    return {
      estimatedValue: 0,
      valueRange: { min: 0, max: 0 },
      confidence: 0,
      analysis: {
        condition: 'Unknown',
        category: 'Unknown',
        period: 'Unknown',
        style: 'Unknown',
        materials: [],
        features: []
      },
      marketAnalysis: 'Unable to generate appraisal. Please ensure clear images are provided and try again.'
    };
  }
} 