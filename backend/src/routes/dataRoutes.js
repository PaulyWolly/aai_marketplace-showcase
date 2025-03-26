const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Upload data file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ 
      message: 'File uploaded successfully',
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get uploaded files list
router.get('/files', async (req, res) => {
  try {
    // TODO: Implement file listing logic
    res.json({ message: 'File listing endpoint' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 