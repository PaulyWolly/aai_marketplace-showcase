const mongoose = require('mongoose');

const AppraisalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  name: { type: String, required: true, default: "Unknown Item" },
  category: { type: String, required: true, default: "Miscellaneous" },
  condition: { type: String, required: true, default: "Unknown" },
  estimatedValue: { type: String, required: true, default: "Unknown" },
  imageUrl: { type: String, required: true },
  images: { type: [String], default: [] },
  height: { type: String },
  width: { type: String },
  weight: { type: String },
  appraisal: {
    details: { type: String, required: true },
    marketResearch: { type: String, required: true }
  },
  isPublished: { type: Boolean, default: true }
});

module.exports = mongoose.model('Appraisal', AppraisalSchema); 