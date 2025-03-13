const express = require('express');
const router = express.Router();
const multer = require('multer');
const openaiService = require('../services/openai.service');

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Route to appraise an item from image
router.post('/appraise', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided for appraisal' });
        }

        // Convert image buffer to base64
        const imageBase64 = req.file.buffer.toString('base64');
        const imageUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

        // Get initial appraisal from image
        const appraisal = await openaiService.analyzeImage(imageUrl);

        // Get detailed market research
        const marketResearch = await openaiService.searchSimilarProducts(appraisal);

        res.json({
            timestamp: new Date(),
            appraisal: {
                details: appraisal,
                marketResearch: marketResearch
            }
        });
    } catch (error) {
        console.error('Appraisal error:', error);
        res.status(500).json({ error: 'Failed to appraise item' });
    }
});

module.exports = router; 