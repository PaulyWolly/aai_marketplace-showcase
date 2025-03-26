const axios = require('axios');

async function testModel() {
  try {
    // Training data with diverse examples
    const trainingData = {
      data: [
        // Basic features only
        {
          height: 30,
          width: 20,
          weight: 2.5,
          category: "Art",
          condition: "Good",
          age: 50,
          rarity: "Rare",
          estimatedValue: 500
        },
        // With colors
        {
          height: 45,
          width: 35,
          weight: 3.8,
          category: "Art",
          condition: "Very Good",
          age: 75,
          rarity: "Very Rare",
          colors: ["Red", "Purple", "Orange"],
          estimatedValue: 1200
        },
        // With image
        {
          height: 25,
          width: 15,
          weight: 1.5,
          category: "Art",
          condition: "Fair",
          age: 30,
          rarity: "Common",
          imageUrl: "https://example.com/art1.jpg",
          estimatedValue: 200
        },
        // With both colors and image
        {
          height: 60,
          width: 40,
          weight: 5.0,
          category: "Art",
          condition: "Excellent",
          age: 100,
          rarity: "Extremely Rare",
          colors: ["Gold", "Silver", "Bronze"],
          imageUrl: "https://example.com/art2.jpg",
          estimatedValue: 2500
        }
      ],
      epochs: 20
    };

    // Train the model
    console.log('Training model with sample data...');
    const trainResponse = await axios.post('http://localhost:3000/api/ml/train/price', trainingData);
    console.log('Training response:', trainResponse.data);

    // Test predictions with different scenarios
    const testCases = [
      // Basic features only
      {
        height: 40,
        width: 30,
        weight: 3.0,
        category: "Art",
        condition: "Good",
        age: 60,
        rarity: "Rare"
      },
      // With colors
      {
        height: 50,
        width: 40,
        weight: 4.0,
        category: "Art",
        condition: "Very Good",
        age: 80,
        rarity: "Very Rare",
        colors: ["Red", "Gold"]
      },
      // With image
      {
        height: 35,
        width: 25,
        weight: 2.8,
        category: "Art",
        condition: "Like New",
        age: 10,
        rarity: "Uncommon",
        imageUrl: "https://example.com/art3.jpg"
      },
      // With both colors and image
      {
        height: 55,
        width: 45,
        weight: 4.5,
        category: "Art",
        condition: "Excellent",
        age: 90,
        rarity: "Extremely Rare",
        colors: ["Blue", "Green", "Yellow"],
        imageUrl: "https://example.com/art4.jpg"
      }
    ];

    console.log('\nTesting predictions with different feature combinations...');
    for (const testCase of testCases) {
      const predictResponse = await axios.post('http://localhost:3000/api/ml/predict/price', { data: testCase });
      console.log('\nTest case:', {
        ...testCase,
        imageUrl: testCase.imageUrl ? '[IMAGE URL]' : undefined // Hide long URLs in output
      });
      console.log('Prediction:', predictResponse.data);
    }

    // Get model status
    const statusResponse = await axios.get('http://localhost:3000/api/ml/status');
    console.log('\nModel status:', statusResponse.data);

  } catch (error) {
    console.error('Error testing model:', error.response ? error.response.data : error.message);
  }
}

testModel(); 