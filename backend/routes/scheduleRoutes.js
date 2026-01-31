const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

// Check File Type
function checkFileType(file, cb) {
  // Allow any file where mimetype starts with 'image/'
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  } else {
    cb(`Error: Images Only! Got ${file.mimetype}`);
  }
}

// Init Upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private (User/Organization/Admin)
router.post('/', protect, authorize('user', 'organization', 'admin'), upload.single('image'), async (req, res) => {
  const { wasteType, quantity, pickupDate, time, address, name, contactNumber, driverSuggestions, latitude, longitude } = req.body;
  const image = req.file ? req.file.path : null;

  try {
    const schedule = new Schedule({
      user: req.user.id,
      wasteType,
      quantity,
      pickupDate,
      time,
      address,
      name,
      contactNumber,
      driverSuggestions,
      latitude,
      longitude,
      image,
    });

    const createdSchedule = await schedule.save();
    res.status(201).json(createdSchedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get logged in user's schedules
// @route   GET /api/schedules/my-schedules
// @access  Private
router.get('/my-schedules', protect, async (req, res) => {
  try {
    const schedules = await Schedule.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all pending schedules (for Drivers/Admins)
// @route   GET /api/schedules/pending
// @access  Private (Driver/Admin)
router.get('/pending', protect, authorize('driver', 'admin'), async (req, res) => {
  try {
    // For now, return all pending. In future, we might filter by location etc.
    const schedules = await Schedule.find({ status: 'Pending' }).populate('user', 'name email');
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all schedules (Admin)
// @route   GET /api/schedules/all
// @access  Private (Admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const schedules = await Schedule.find({}).populate('user', 'name email').populate('assignedDriver', 'name');
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get tasks assigned to driver
// @route   GET /api/schedules/driver-tasks
// @access  Private (Driver)
router.get('/driver-tasks', protect, authorize('driver'), async (req, res) => {
  try {
    console.log(`[Schedule] Fetching driver tasks for: ${req.user.id} (Type: ${typeof req.user.id})`);
    const schedules = await Schedule.find({ assignedDriver: req.user.id }).populate('user', 'name email');
    console.log(`[Schedule] Found ${schedules.length} tasks for driver.`);
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get schedule analytics
// @route   GET /api/schedules/analytics
// @access  Private (Admin)
router.get('/analytics', protect, authorize('admin'), async (req, res) => {
  try {
    const total = await Schedule.countDocuments();
    const completed = await Schedule.countDocuments({ status: 'Completed' });
    const pending = await Schedule.countDocuments({ status: 'Pending' });
    
    // Get daily stats for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyStats = await Schedule.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ total, completed, pending, dailyStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Assign driver to schedule
// @route   PUT /api/schedules/:id/assign
// @access  Private (Admin)
router.put('/:id/assign', protect, authorize('admin'), async (req, res) => {
    const { driverId } = req.body;
    try {
        console.log(`[Assign Debug] Processing assignment for Schedule ID: ${req.params.id} to Driver: ${driverId}`);
        
        // Check if driver is already assigned to an active task ON THE SAME DATE
        if (driverId) {
            // First, get the target schedule's date
            const targetSchedule = await Schedule.findById(req.params.id);
            if (!targetSchedule) return res.status(404).json({ message: 'Schedule not found' });
            
            const targetDate = new Date(targetSchedule.pickupDate);
            targetDate.setHours(0,0,0,0);
            
            // Check active Schedules on the SAME DATE
            // We fetch all active schedules for the driver and check their dates in JS or use date range query
            // Simpler: Fetch active schedules for driver and compare dates
            const activeSchedules = await Schedule.find({
                assignedDriver: driverId,
                status: { $in: ['Assigned', 'Accepted', 'On the way'] }
            });

            const hasConflict = activeSchedules.some(s => {
                const sDate = new Date(s.pickupDate);
                sDate.setHours(0,0,0,0);
                return sDate.getTime() === targetDate.getTime();
            });

             if (hasConflict) {
                return res.status(400).json({ message: 'Driver is already assigned to a Pickup on this date.' });
            }

            // Check active Complaints (Assume Complaints are for TODAY)
            // Only block if target date is TODAY
            const today = new Date();
            today.setHours(0,0,0,0);
            
            if (targetDate.getTime() === today.getTime()) {
                const Complaint = require('../models/Complaint'); 
                const activeComplaint = await Complaint.findOne({
                    assignedDriver: driverId,
                    status: { $in: ['Assigned', 'Accepted', 'On the way'] }
                });

                if (activeComplaint) {
                    return res.status(400).json({ message: 'Driver is already assigned to an active Complaint (Today).' });
                }
            }
        }
        
        let updateData = {};
        if (!driverId) {
            updateData = { assignedDriver: null, status: 'Pending' };
        } else {
            updateData = { assignedDriver: driverId, status: 'Assigned' };
        }

        console.log('[Assign Debug] Calling findByIdAndUpdate...');
        // Use findByIdAndUpdate to bypass full document validation (legacy data might miss fields)
        const updatedSchedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedSchedule) {
            console.log('[Assign Debug] Schedule not found');
            return res.status(404).json({ message: 'Schedule not found' });
        }
        
        console.log('[Assign Debug] Update successful');
        res.json(updatedSchedule);
    } catch (error) {
        console.error('Schedule Assignment Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update schedule status
// @route   PUT /api/schedules/:id/status
// @access  Private (Driver/Admin)
router.put('/:id/status', protect, authorize('driver', 'admin'), async (req, res) => {
    const { status, collectedWeight } = req.body;

    try {
        // We still need to fetch first to check authorization (is this driver assigned?)
        const schedule = await Schedule.findById(req.params.id);

        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        // Security check for drivers
        if (req.user.role === 'driver' && schedule.assignedDriver?.toString() !== req.user.id && status !== 'Assigned') {
             return res.status(401).json({ message: 'Not authorized to update this task' });
        }

        let updateData = { status };
        
        // Auto-assign driver if accepting a pending task (though usually it's already assigned)
        if (status === 'Assigned' && req.user.role === 'driver') {
             updateData.assignedDriver = req.user.id;
        }

        // Handle Completion and Weight
        if (status === 'Completed') {
            const weight = parseFloat(collectedWeight) || 0;
            updateData.collectedWeight = weight;

            // Update Driver's current weight with Auto-Reset logic
            if (schedule.assignedDriver) {
                const driverUser = await User.findById(schedule.assignedDriver);
                if (driverUser) {
                    let newWeight = (driverUser.currentWeightKg || 0) + weight;
                    // Auto-reset if weight reaches or exceeds 100
                    if (newWeight >= 100) {
                        newWeight = 0;
                        console.log(`Driver ${driverUser.name} reached capacity. Auto-resetting weight to 0.`);
                    }
                    driverUser.currentWeightKg = newWeight;
                    await driverUser.save();
                }
            }
        }

        // Use findByIdAndUpdate to bypass validation
        const updatedSchedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.json(updatedSchedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Reschedule a pickup
// @route   PUT /api/schedules/:id/reschedule
// @access  Private (User)
router.put('/:id/reschedule', protect, async (req, res) => {
    const { pickupDate, time } = req.body;

    try {
        const schedule = await Schedule.findById(req.params.id);

        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        // Check user authorization
        if (schedule.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to reschedule this pickup' });
        }

        // Check if status allows rescheduling
        // Allowed: Pending, Assigned, Accepted
        // Not Allowed: On the way, Completed, Cancelled
        const allowedStatuses = ['Pending', 'Assigned', 'Accepted'];
        if (!allowedStatuses.includes(schedule.status)) {
            return res.status(400).json({ 
                message: `Cannot reschedule. Current status is ${schedule.status}. Only Pending, Assigned, or Accepted pickups can be rescheduled.` 
            });
        }

        // Update fields
        schedule.pickupDate = pickupDate;
        schedule.time = time;
        
        // Reset status and unassign driver
        schedule.status = 'Pending';
        schedule.assignedDriver = null; 
        // Note: keeping other fields like address/wasteType same as per requirement "only pick up section"

        const updatedSchedule = await schedule.save();
        res.json(updatedSchedule);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
