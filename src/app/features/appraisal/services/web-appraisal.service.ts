import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, delay, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { EnvironmentToggleService } from '../../../core/services/environment-toggle.service';
import { ImagePreprocessingService } from './image-preprocessing.service';

export interface WebAppraisalRequest {
  imageData: string;
  itemType: string;
  additionalInfo?: string;
}

export interface AppraisalSource {
  name: string;
  confidence: number;
  estimatedValue: string;
  description: string;
  itemDetails?: Record<string, any>;
  similarItems?: Array<{
    title: string;
    price: string;
    imageUrl: string;
    url: string;
  }>;
}

export interface WebAppraisalResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl: string;
  processingTime: number;
  submittedAt: string;
  completedAt?: string;
  aggregatedResult: {
    suggestedName: string;
    suggestedCategory: string;
    suggestedCondition: string;
    suggestedDescription: string;
    estimatedValueRange: {
      min: string;
      max: string;
    };
    confidence: number;
  };
  sources: AppraisalSource[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebAppraisalService {
  private apiUrl = `${environment.apiUrl}/appraisals/web`;
  
  // For demo/development purposes, we'll simulate API responses
  private get mockEnabled(): boolean {
    return !this.environmentToggle.isProductionModeSync();
  }
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private environmentToggle: EnvironmentToggleService,
    private imagePreprocessingService: ImagePreprocessingService
  ) {}

  /**
   * Submit a new web appraisal request
   * @param request The appraisal request data
   * @returns Observable of the initial appraisal result
   */
  submitAppraisalRequest(request: WebAppraisalRequest): Observable<WebAppraisalResult> {
    if (this.mockEnabled) {
      return this.mockSubmitAppraisal(request);
    }
    
    // First preprocess the image
    return this.imagePreprocessingService.preprocessImage(request.imageData)
      .pipe(
        switchMap(processedImage => {
          // Then submit the appraisal with the processed image
          const processedRequest = {
            ...request,
            imageData: processedImage
          };
          return this.http.post<WebAppraisalResult>(`${this.apiUrl}/submit`, processedRequest);
        })
      );
  }
  
  /**
   * Check the status of an appraisal request
   * @param appraisalId The ID of the appraisal to check
   * @returns Observable of the current appraisal result
   */
  checkAppraisalStatus(appraisalId: string): Observable<WebAppraisalResult> {
    if (this.mockEnabled) {
      return this.mockCheckStatus(appraisalId);
    }
    
    return this.http.get<WebAppraisalResult>(`${this.apiUrl}/${appraisalId}/status`);
  }
  
  /**
   * Mock implementation of submitAppraisalRequest for development
   */
  private mockSubmitAppraisal(request: WebAppraisalRequest): Observable<WebAppraisalResult> {
    const id = `appraisal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const result: WebAppraisalResult = {
      id,
      status: 'pending',
      imageUrl: request.imageData,
      processingTime: 0,
      submittedAt: new Date().toISOString(),
      aggregatedResult: {
        suggestedName: '',
        suggestedCategory: '',
        suggestedCondition: '',
        suggestedDescription: '',
        estimatedValueRange: {
          min: '',
          max: ''
        },
        confidence: 0
      },
      sources: []
    };
    
    // Store in session storage for mock persistence
    sessionStorage.setItem(`appraisal_${id}`, JSON.stringify({
      result,
      request,
      progress: 0,
      startTime: Date.now()
    }));
    
    return of(result).pipe(delay(1500)); // Simulate network delay
  }
  
  /**
   * Mock implementation of checkAppraisalStatus for development
   */
  private mockCheckStatus(appraisalId: string): Observable<WebAppraisalResult> {
    const storedData = sessionStorage.getItem(`appraisal_${appraisalId}`);
    
    if (!storedData) {
      throw new Error(`Appraisal with ID ${appraisalId} not found`);
    }
    
    const data = JSON.parse(storedData);
    const { result, request, progress } = data;
    const currentTime = Date.now();
    const elapsedTime = (currentTime - data.startTime) / 1000; // in seconds
    
    // Simulate processing progress
    let newProgress = progress;
    if (result.status === 'pending' && elapsedTime > 2) {
      result.status = 'processing';
      newProgress = 10;
    } else if (result.status === 'processing') {
      // Increment progress by 10-20% each check
      newProgress = Math.min(progress + Math.floor(Math.random() * 10) + 10, 100);
      
      // Complete after reaching 100%
      if (newProgress >= 100) {
        result.status = 'completed';
        result.completedAt = new Date().toISOString();
        result.processingTime = elapsedTime;
        
        // Generate mock results based on item type
        this.generateMockResults(result, request);
      }
    }
    
    // Update stored data
    sessionStorage.setItem(`appraisal_${appraisalId}`, JSON.stringify({
      ...data,
      progress: newProgress,
      result
    }));
    
    return of({...result}).pipe(
      map(res => ({...res, processingProgress: newProgress})),
      delay(800) // Simulate network delay
    );
  }
  
  /**
   * Generate mock appraisal results for development
   */
  private generateMockResults(result: WebAppraisalResult, request: WebAppraisalRequest): void {
    const itemType = request.itemType;
    
    // Generate different results based on item type
    switch (itemType) {
      case 'Antique':
        this.generateAntiqueResults(result);
        break;
      case 'Jewelry':
        this.generateJewelryResults(result);
        break;
      case 'Vintage Clothing':
        this.generateVintageClothingResults(result);
        break;
      default:
        this.generateGenericResults(result, itemType);
        break;
    }
  }
  
  private generateAntiqueResults(result: WebAppraisalResult): void {
    result.aggregatedResult = {
      suggestedName: 'Victorian Mahogany Side Table',
      suggestedCategory: 'Furniture',
      suggestedCondition: 'Good',
      suggestedDescription: 'Mid-19th century Victorian mahogany side table with carved details and original brass hardware. Shows some wear consistent with age but overall in good condition.',
      estimatedValueRange: {
        min: '$800',
        max: '$1,200'
      },
      confidence: 85
    };
    
    result.sources = [
      {
        name: 'Antiques Roadshow Database',
        confidence: 90,
        estimatedValue: '$950',
        description: 'Victorian mahogany side table, circa 1860-1880. Features original brass hardware and carved details typical of the period.',
        itemDetails: {
          period: 'Victorian',
          material: 'Mahogany',
          age: 'Circa 1860-1880',
          condition: 'Good with age-appropriate wear',
          dimensions: '30"H x 24"W x 18"D'
        },
        similarItems: [
          {
            title: 'Victorian Mahogany Side Table with Drawer',
            price: '$1,100',
            imageUrl: 'https://example.com/images/victorian_table1.jpg',
            url: 'https://example.com/items/victorian_table1'
          },
          {
            title: 'Victorian Carved Mahogany Occasional Table',
            price: '$950',
            imageUrl: 'https://example.com/images/victorian_table2.jpg',
            url: 'https://example.com/items/victorian_table2'
          }
        ]
      },
      {
        name: 'Heritage Auctions',
        confidence: 80,
        estimatedValue: '$800-$1,200',
        description: 'Victorian mahogany side table with single drawer. Shows expected wear and patina consistent with age and use.',
        itemDetails: {
          style: 'Victorian',
          material: 'Mahogany',
          features: 'Single drawer with brass pull',
          condition: 'Good vintage condition'
        }
      }
    ];
  }
  
  private generateJewelryResults(result: WebAppraisalResult): void {
    result.aggregatedResult = {
      suggestedName: 'Art Deco Diamond and Sapphire Ring',
      suggestedCategory: 'Jewelry',
      suggestedCondition: 'Excellent',
      suggestedDescription: 'Platinum Art Deco ring featuring a center diamond approximately 1 carat, surrounded by calibré-cut sapphires in a geometric design typical of the period.',
      estimatedValueRange: {
        min: '$3,500',
        max: '$5,000'
      },
      confidence: 92
    };
    
    result.sources = [
      {
        name: 'Gemological Institute',
        confidence: 95,
        estimatedValue: '$4,200',
        description: 'Art Deco platinum ring with center diamond approximately 1 carat (H color, VS2 clarity) surrounded by calibré-cut sapphires in geometric setting.',
        itemDetails: {
          style: 'Art Deco',
          metal: 'Platinum',
          centerStone: 'Diamond, approx. 1 carat',
          diamondQuality: 'H color, VS2 clarity',
          accentStones: 'Calibré-cut sapphires',
          period: 'Circa 1925-1935',
          ringSize: '6.5'
        },
        similarItems: [
          {
            title: 'Art Deco Diamond and Sapphire Ring in Platinum',
            price: '$4,500',
            imageUrl: 'https://example.com/images/artdeco_ring1.jpg',
            url: 'https://example.com/items/artdeco_ring1'
          }
        ]
      },
      {
        name: 'Vintage Jewelry Appraisers',
        confidence: 90,
        estimatedValue: '$3,800-$4,800',
        description: 'Authentic Art Deco platinum ring featuring a center diamond of approximately 1 carat with sapphire accents in a geometric design.',
        itemDetails: {
          period: 'Art Deco (1920s-1930s)',
          materials: 'Platinum, diamond, sapphires',
          condition: 'Excellent vintage condition'
        }
      }
    ];
  }
  
  private generateVintageClothingResults(result: WebAppraisalResult): void {
    result.aggregatedResult = {
      suggestedName: '1950s Dior New Look Cocktail Dress',
      suggestedCategory: 'Vintage Clothing',
      suggestedCondition: 'Very Good',
      suggestedDescription: 'Christian Dior inspired "New Look" black silk cocktail dress from the 1950s featuring a nipped waist, full skirt, and original label. Some minor wear but overall excellent vintage condition.',
      estimatedValueRange: {
        min: '$600',
        max: '$900'
      },
      confidence: 88
    };
    
    result.sources = [
      {
        name: 'Vintage Fashion Archive',
        confidence: 90,
        estimatedValue: '$750',
        description: '1950s black silk cocktail dress in the Dior "New Look" silhouette with original label. Features a fitted bodice, nipped waist, and full skirt.',
        itemDetails: {
          designer: 'Christian Dior influence',
          era: '1950s',
          material: 'Silk',
          closure: 'Back metal zipper',
          condition: 'Very good vintage condition',
          measurements: 'Bust: 34", Waist: 26", Length: 42"'
        },
        similarItems: [
          {
            title: '1950s Christian Dior Black Silk Cocktail Dress',
            price: '$850',
            imageUrl: 'https://example.com/images/dior_dress1.jpg',
            url: 'https://example.com/items/dior_dress1'
          },
          {
            title: '1950s New Look Style Cocktail Dress',
            price: '$650',
            imageUrl: 'https://example.com/images/vintage_dress2.jpg',
            url: 'https://example.com/items/vintage_dress2'
          }
        ]
      },
      {
        name: 'Vintage Couture Specialists',
        confidence: 85,
        estimatedValue: '$600-$900',
        description: 'Classic 1950s cocktail dress in the Dior New Look style with full skirt and fitted bodice. Shows some minor wear consistent with age.',
        itemDetails: {
          period: '1950s',
          style: 'New Look',
          material: 'Silk',
          condition: 'Very good with minor age-appropriate wear'
        }
      }
    ];
  }
  
  private generateGenericResults(result: WebAppraisalResult, itemType: string): void {
    // Default to 'Item' if itemType is undefined
    const type = itemType || 'Item';
    
    result.aggregatedResult = {
      suggestedName: `Vintage ${type} Item`,
      suggestedCategory: type,
      suggestedCondition: 'Good',
      suggestedDescription: `Interesting vintage ${type.toLowerCase()} piece showing characteristics typical of mid-20th century design. Good condition with some signs of age and use.`,
      estimatedValueRange: {
        min: '$200',
        max: '$400'
      },
      confidence: 75
    };
    
    result.sources = [
      {
        name: 'Collectibles Database',
        confidence: 80,
        estimatedValue: '$300',
        description: `Vintage ${type.toLowerCase()} piece from approximately 1950-1970. Shows typical design elements of the period.`,
        itemDetails: {
          type: type,
          era: 'Mid-20th Century',
          condition: 'Good vintage condition'
        },
        similarItems: [
          {
            title: `Vintage ${type} from the 1960s`,
            price: '$350',
            imageUrl: 'https://example.com/images/generic_item1.jpg',
            url: 'https://example.com/items/generic_item1'
          }
        ]
      },
      {
        name: 'Vintage Appraisers Network',
        confidence: 70,
        estimatedValue: '$250-$400',
        description: `Mid-century ${type.toLowerCase()} showing typical characteristics of the period. Good collectible example.`,
        itemDetails: {
          period: 'Mid-Century',
          condition: 'Good with age-appropriate wear'
        }
      }
    ];
  }

  /**
   * Get the status and result of a web appraisal request
   */
  getAppraisalResult(id: string): Observable<WebAppraisalResult> {
    return this.http.get<WebAppraisalResult>(`${this.apiUrl}/${id}`).pipe(
      tap(result => console.log('Web appraisal result retrieved:', result)),
      catchError(this.handleError)
    );
  }

  /**
   * Get all web appraisal requests for the current user
   */
  getUserAppraisalRequests(): Observable<WebAppraisalResult[]> {
    return this.http.get<WebAppraisalResult[]>(`${this.apiUrl}/user`).pipe(
      tap(results => console.log(`Retrieved ${results.length} web appraisal requests`)),
      catchError(this.handleError)
    );
  }

  /**
   * Convert a web appraisal result to a standard appraisal format
   * that can be saved in the system
   */
  convertToAppraisal(result: WebAppraisalResult): any {
    if (result.status !== 'completed') {
      throw new Error('Cannot convert incomplete appraisal result');
    }

    const { aggregatedResult } = result;
    
    // Format the market research section with similar items
    let marketResearch = `## Market Analysis\n\nBased on current market trends and comparable items, this ${aggregatedResult.suggestedCategory.toLowerCase()} is valued between ${aggregatedResult.estimatedValueRange.min} and ${aggregatedResult.estimatedValueRange.max}.\n\n`;
    
    // Add similar items if available
    const hasSimilarItems = result.sources.some(source => 
      source.similarItems && source.similarItems.length > 0
    );
    
    if (hasSimilarItems) {
      marketResearch += '## Similar Items Found\n\n';
      
      result.sources.forEach(source => {
        if (source.similarItems && source.similarItems.length > 0) {
          marketResearch += `### From ${source.name}\n\n`;
          
          source.similarItems.forEach(item => {
            marketResearch += `- **${item.title}**: ${item.price} ([View Source](${item.url}))\n`;
          });
          
          marketResearch += '\n';
        }
      });
    }
    
    // Format the details section with source information
    let details = `## Item Details\n\n`;
    details += `**Suggested Name**: ${aggregatedResult.suggestedName}\n\n`;
    details += `**Category**: ${aggregatedResult.suggestedCategory}\n\n`;
    details += `**Condition**: ${aggregatedResult.suggestedCondition}\n\n`;
    details += `**Description**: ${aggregatedResult.suggestedDescription}\n\n`;
    
    details += '## Appraisal Sources\n\n';
    
    result.sources.forEach(source => {
      details += `### ${source.name} (${source.confidence}% confidence)\n\n`;
      details += `**Estimated Value**: ${source.estimatedValue}\n\n`;
      details += `**Description**: ${source.description}\n\n`;
      
      if (source.itemDetails) {
        details += '**Item Details**:\n\n';
        
        Object.entries(source.itemDetails).forEach(([key, value]) => {
          if (value) {
            details += `- **${this.formatKey(key)}**: ${Array.isArray(value) ? value.join(', ') : value}\n`;
          }
        });
        
        details += '\n';
      }
    });
    
    return {
      name: aggregatedResult.suggestedName,
      category: aggregatedResult.suggestedCategory,
      condition: aggregatedResult.suggestedCondition,
      estimatedValue: `${aggregatedResult.estimatedValueRange.min} - ${aggregatedResult.estimatedValueRange.max}`,
      imageUrl: result.imageUrl,
      appraisal: {
        details,
        marketResearch
      },
      isPublished: false, // Default to not published
      timestamp: new Date()
    };
  }

  /**
   * Format a key from camelCase or snake_case to Title Case
   */
  private formatKey(key: string): string {
    // Handle camelCase
    const spacedKey = key.replace(/([A-Z])/g, ' $1')
      // Handle snake_case
      .replace(/_/g, ' ')
      // Capitalize first letter
      .replace(/^./, str => str.toUpperCase());
    
    return spacedKey;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any) {
    console.error('Web appraisal service error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'You must be logged in to use this feature';
          break;
        case 403:
          errorMessage = 'You do not have permission to access this resource';
          break;
        case 404:
          errorMessage = 'The requested resource was not found';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
} 