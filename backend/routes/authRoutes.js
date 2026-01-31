const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, role, contactNumber, address } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      contactNumber,
      address,
      vehicleType: role === 'driver' ? req.body.vehicleType : ''
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

const Schedule = require('../models/Schedule');
const Complaint = require('../models/Complaint');

// @desc    Get all drivers
// @route   GET /api/auth/drivers
// @access  Private (Admin)
router.get('/drivers', protect, authorize('admin'), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('-password');

    // Check availability for each driver
    const driversWithStatus = await Promise.all(drivers.map(async (driver) => {
        // Find ALL active schedules to get their dates
        const activeSchedules = await Schedule.find({
            assignedDriver: driver._id,
            status: { $in: ['Assigned', 'Accepted', 'On the way'] }
        }).select('pickupDate');
        
        const activeComplaint = await Complaint.findOne({
            assignedDriver: driver._id,
            status: { $in: ['Assigned', 'Accepted', 'On the way'] }
        });

        const busyDates = activeSchedules.map(s => {
            const d = new Date(s.pickupDate);
            d.setHours(0,0,0,0);
            return d.toISOString();
        });

        // If there is an active complaint, mark TODAY as busy
        if (activeComplaint) {
            const today = new Date();
            today.setHours(0,0,0,0);
            const todayStr = today.toISOString();
            if (!busyDates.includes(todayStr)) {
                busyDates.push(todayStr);
            }
        }

        // isBusy should basically reflect if the driver is busy TODAY.
        // This is important for complaints which are assumed to be "immediate/today".
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayStr = today.toISOString();
        const isBusy = busyDates.includes(todayStr);
        
        return {
            ...driver.toObject(),
            isBusy, // Busy ONLY if they have a task TODAY
            busyDates // Array of ISO strings representing busy days
        };
    }));

    res.json(driversWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Update user details (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin)
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, contactNumber, vehicleType, address } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name || user.name;
        user.contactNumber = contactNumber || user.contactNumber;
        user.vehicleType = vehicleType || user.vehicleType;
        user.address = address || user.address;

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            contactNumber: updatedUser.contactNumber,
            vehicleType: updatedUser.vehicleType,
            address: updatedUser.address
        });
    } catch (error) {
        console.error(error);
    }
});

// @desc    Update driver load (Driver only)
// @route   PUT /api/auth/update-load
// @access  Private (Driver)
router.put('/update-load', protect, authorize('driver'), async (req, res) => {
    try {
        const { currentLoad } = req.body;
        
        if (currentLoad < 0 || currentLoad > 100) {
            return res.status(400).json({ message: 'Load must be between 0 and 100' });
        }

        const user = await User.findById(req.user.id);
        user.currentLoad = currentLoad;
        await user.save();

        res.json({ message: 'Load updated', currentLoad: user.currentLoad });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
