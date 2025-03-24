const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const Appraisal = require('../models/appraisal.model');

// Connect to MongoDB
mongoose.connect(config.mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Sample items data
const sampleItems = [
  {
    name: 'Vintage Watch',
    category: 'Jewelry',
    condition: 'Good',
    estimatedValue: '$500-$700',
    imageUrl: 'https://images.unsplash.com/photo-1587925358603-c2eea5305bbc?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    images: [],
    appraisal: {
      details: '**Vintage Watch** from the 1960s with a leather strap and gold-plated case. The watch features a mechanical movement and is in good working condition with minor scratches on the case.',
      marketResearch: 'Similar vintage watches from this era typically sell for $500-$700 depending on condition and brand. The market for vintage watches has been steady with a slight increase in value over the past few years.'
    },
    isPublished: true
  },
  {
    name: 'Antique Desk',
    category: 'Furniture',
    condition: 'Excellent',
    estimatedValue: '$1,200-$1,500',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    images: [],
    appraisal: {
      details: '**Antique Desk** from the early 20th century made of solid oak with original brass hardware. The desk features three drawers and a leather writing surface. It has been well-maintained and shows minimal wear.',
      marketResearch: 'Antique desks of this quality and age typically sell for $1,200-$1,500 in the current market. The demand for well-preserved antique furniture remains strong among collectors and interior designers.'
    },
    isPublished: true
  },
  {
    name: 'Rare Coin Collection',
    category: 'Collectibles',
    condition: 'Mint',
    estimatedValue: '$3,000-$3,500',
    imageUrl: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    images: [],
    appraisal: {
      details: '**Rare Coin Collection** featuring 25 silver coins from the late 19th century. All coins are in mint or near-mint condition and include several rare dates and mint marks.',
      marketResearch: 'This collection of rare coins has an estimated market value of $3,000-$3,500 based on recent auction results. The numismatic market has shown steady growth, with particular interest in well-preserved 19th-century silver coins.'
    },
    isPublished: true
  },
  {
    name: 'Modern Art Painting',
    category: 'Art',
    condition: 'Excellent',
    estimatedValue: '$2,500-$3,000',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    images: [],
    appraisal: {
      details: '**Modern Art Painting** created in 2010 by an emerging artist. Acrylic on canvas, 36" x 48". The painting features abstract geometric patterns in vibrant colors and is professionally framed.',
      marketResearch: 'Works by this artist have been increasing in value, with similar pieces selling for $2,500-$3,000 in galleries and at auction. The market for contemporary abstract art remains strong, particularly for artists with gallery representation.'
    },
    isPublished: true
  },
  {
    name: 'Vintage Camera',
    category: 'Electronics',
    condition: 'Good',
    estimatedValue: '$300-$400',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    images: [],
    appraisal: {
      details: '**Vintage Camera** from the 1950s with original leather case and manual. The camera is in good working condition with some cosmetic wear on the body. All mechanical functions operate smoothly.',
      marketResearch: 'Vintage cameras of this model and era typically sell for $300-$400 depending on condition. There is a steady collector market for vintage photography equipment, with particular interest in working examples.'
    },
    isPublished: true
  }
];

async function createSampleItems() {
  try {
    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    console.log(`Using admin user: ${adminUser.email} (${adminUser._id})`);
    
    // Check if items already exist
    const existingItemsCount = await Appraisal.countDocuments();
    if (existingItemsCount > 0) {
      console.log(`${existingItemsCount} items already exist in the database.`);
      const shouldContinue = process.argv.includes('--force');
      
      if (!shouldContinue) {
        console.log('Use --force to add sample items anyway.');
        process.exit(0);
      }
    }
    
    // Add userId to each item
    const itemsWithUserId = sampleItems.map(item => ({
      ...item,
      userId: adminUser._id.toString(),
      timestamp: new Date()
    }));
    
    // Insert sample items
    const result = await Appraisal.insertMany(itemsWithUserId);
    console.log(`Successfully added ${result.length} sample items to the database.`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error creating sample items:', error);
    process.exit(1);
  }
}

// Run the function
createSampleItems(); 