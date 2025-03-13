const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Item = require('../models/Item');
const { auth, isAdmin } = require('../middleware/auth');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Get all items
router.get('/', auth, async (req, res) => {
  try {
    const items = await Item.find();
    res.json({ items, total: items.length });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new item
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      sellerId: req.user.id
    };

    if (req.file) {
      itemData.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      itemData.imageSource = 'upload';
      itemData.imageKey = req.file.filename;
    }

    const newItem = await Item.create(itemData);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get item by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update item (admin only)
router.put('/:id', auth, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const updateData = { ...req.body };

    if (req.file) {
      // Delete old image if it was uploaded
      if (item.imageSource === 'upload' && item.imageKey) {
        const oldImagePath = path.join(__dirname, '..', 'uploads', item.imageKey);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      updateData.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      updateData.imageSource = 'upload';
      updateData.imageKey = req.file.filename;
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete item (admin only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Delete uploaded image if it exists
    if (item.imageSource === 'upload' && item.imageKey) {
      const imagePath = path.join(__dirname, '..', 'uploads', item.imageKey);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Item.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 