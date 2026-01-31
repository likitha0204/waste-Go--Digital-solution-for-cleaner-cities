const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// User & Organization Route
router.get('/user-org', protect, authorize('user', 'organization'), (req, res) => {
  res.json({ message: 'Access granted to User and Organization', user: req.user });
});

// Driver Route
router.get('/driver', protect, authorize('driver'), (req, res) => {
  res.json({ message: 'Access granted to Driver', user: req.user });
});

// Admin Route
router.get('/admin', protect, authorize('admin'), (req, res) => {
  res.json({ message: 'Access granted to Admin', user: req.user });
});

module.exports = router;
