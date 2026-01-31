const express = require('express');
const router = express.Router();
const Suggestion = require('../models/Suggestion');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Create a suggestion
// @route   POST /api/suggestions
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Please add a message' });
    }

    const suggestion = await Suggestion.create({
      message,
    });

    res.status(201).json(suggestion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all suggestions
// @route   GET /api/suggestions
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const suggestions = await Suggestion.find().sort({ createdAt: -1 });
    res.json(suggestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
