# AI Art Appraisal System

An intelligent system for appraising art pieces using machine learning and computer vision.

## Project Phases

### Phase 1: Basic Price Prediction Model ✅
- [x] Set up basic project structure
- [x] Implement data preprocessing
- [x] Create initial price prediction model
- [x] Add basic error handling
- [x] Implement model saving/loading
- [x] Add logging system

### Phase 2: Enhanced Model Features ✅
- [x] Add cross-validation for better evaluation
- [x] Implement feature importance analysis
- [x] Add support for color features
- [x] Add support for image features
- [x] Implement confidence scoring
- [x] Add non-negative prediction constraints

### Phase 3: Image Analysis
- [ ] Implement image preprocessing
- [ ] Create CNN model for image feature extraction
- [ ] Add image classification capabilities
- [ ] Integrate image features with price prediction
- [ ] Add image similarity search

### Phase 4: Real-time Updates
- [ ] Implement real-time price updates
- [ ] Add market trend analysis
- [ ] Create feedback loop for model improvement
- [ ] Add automated retraining system

## Features

### Completed
- Price prediction based on multiple features
- Cross-validation for model evaluation
- Feature importance analysis
- Support for color and image features
- Confidence scoring for predictions
- Non-negative price predictions
- Comprehensive error handling
- Detailed logging system

### In Progress
- Image analysis and classification
- Real-time price updates

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-art-appraisal.git
cd ai-art-appraisal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Usage

### Price Prediction
```javascript
const prediction = await mlService.predictPrice({
  height: 30,
  width: 20,
  weight: 2.5,
  category: "Art",
  condition: "Good",
  age: 50,
  rarity: "Rare",
  colors: ["Blue", "Green"],
  imageUrl: "https://example.com/art.jpg"
});
```

### Image Classification
```javascript
const classification = await mlService.classifyImage(imageData);
```

## API Endpoints

### Price Prediction
- `POST /api/ml/predict/price` - Get price prediction for an item
- `POST /api/ml/train/price` - Train the price prediction model
- `GET /api/ml/status` - Get model status and performance metrics

### Image Analysis
- `POST /api/ml/classify/image` - Classify an image
- `POST /api/ml/train/image` - Train the image classification model

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
