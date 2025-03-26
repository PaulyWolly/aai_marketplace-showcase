export const environment = {
  production: true,
  apiUrl: '/api',
  externalApis: {
    aiAppraisal: {
      enabled: true,
      modelVersion: 'gpt-4o',
      confidenceThreshold: 0.8, // Higher threshold for production
      features: {
        imageAnalysis: true,
        marketAnalysis: true,
        priceEstimation: true
      }
    }
  },
  mockEnabled: false // Always use real API endpoints in production
}; 