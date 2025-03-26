export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  externalApis: {
    aiAppraisal: {
      enabled: true,
      modelVersion: 'gpt-4o',
      confidenceThreshold: 0.7,
      features: {
        imageAnalysis: true,
        marketAnalysis: true,
        priceEstimation: true
      }
    }
  },
  mockEnabled: true // Set to false to use real API endpoints
}; 