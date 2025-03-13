const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  imageSource: {
    type: String,
    enum: ['url', 'upload', 's3'],
    default: 'url'
  },
  imageKey: {
    type: String,
    // This will store the S3 key when we implement S3 storage
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
itemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual populate for seller information
itemSchema.virtual('seller', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true
});

// Always populate seller when finding items
itemSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'seller',
    select: 'firstName lastName email'
  });
  next();
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item; 