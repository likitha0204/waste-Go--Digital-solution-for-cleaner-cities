const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get messages for a specific room
// @route   GET /api/messages/:room
// @access  Private
router.get('/:room', protect, async (req, res) => {
  try {
    const { room } = req.params;
    // Fetch messages for the room OR broadcast messages, sorted by timestamp
    const messages = await Message.find({
      $or: [{ room: room }, { room: 'broadcast' }]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
