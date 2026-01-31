const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Complaint = require('../models/Complaint');
const { protect, authorize } = require('../middleware/authMiddleware');

// Set up storage engine
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});

// Init Upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Check File Type
function checkFileType(file, cb) {
  // Allow any file where mimetype starts with 'image/'
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  } else {
    console.log(`[Upload Rejected] MIME: ${file.mimetype}, NAME: ${file.originalname}`);
    cb(`Error: Images Only! Got ${file.mimetype}`);
  }
}

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private (User/Organization)
router.post(
  '/',
  protect,
  authorize('user', 'organization'),
  (req, res, next) => {
    upload.single('image')(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(400).json({ message: `Upload Error: ${err.message}` });
      } else if (err) {
        // An unknown error occurred when uploading.
        return res.status(400).json({ message: err });
      }
      // Everything went fine.
      next();
    });
  },
  async (req, res) => {
    const { description, address, latitude, longitude, wasteType } = req.body;
    const image = req.file ? req.file.path : null;

    try {
      const complaint = new Complaint({
        user: req.user.id,
        description,
        address,
        image,
        latitude,
        longitude,
        wasteType,
      });

      const createdComplaint = await complaint.save();
      res.status(201).json(createdComplaint);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  }
);

// @desc    Get logged in user's complaints
// @route   GET /api/complaints/my-complaints
// @access  Private
router.get('/my-complaints', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all complaints (Admin)
// @route   GET /api/complaints/all
// @access  Private (Admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const complaints = await Complaint.find({})
      .populate('user', 'name email')
      .populate('assignedDriver', 'name');
    res.json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get complaint analytics
// @route   GET /api/complaints/analytics
// @access  Private (Admin)
router.get('/analytics', protect, authorize('admin'), async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    const pending = await Complaint.countDocuments({ status: 'Pending' });

    // Get daily stats for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ total, resolved, pending, dailyStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all pending complaints
// @route   GET /api/complaints/pending
// @access  Private (Driver/Admin)
router.get('/pending', protect, authorize('driver', 'admin'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ status: 'Pending' }).populate('user', 'name email');
    res.json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get tasks assigned to driver
// @route   GET /api/complaints/driver-tasks
// @access  Private (Driver)
router.get('/driver-tasks', protect, authorize('driver'), async (req, res) => {
  try {
    console.log(`[Complaint] Fetching driver tasks for: ${req.user.id} (Type: ${typeof req.user.id})`);
    const complaints = await Complaint.find({ assignedDriver: req.user.id }).populate('user', 'name email');
    console.log(`[Complaint] Found ${complaints.length} tasks for driver.`);
    res.json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Assign driver to complaint
// @route   PUT /api/complaints/:id/assign
// @access  Private (Admin)
router.put('/:id/assign', protect, authorize('admin'), async (req, res) => {
    const { driverId } = req.body;
    try {
        // Check if driver is already assigned to an active task
        if (driverId) {
            // Check active Complaints
            const activeComplaint = await Complaint.findOne({
                assignedDriver: driverId,
                status: { $in: ['Assigned', 'Accepted', 'On the way'] }
            });

             if (activeComplaint) {
                return res.status(400).json({ message: 'Driver is already assigned to an active Complaint.' });
            }

             // Check active Schedules (Cross-check)
            const Schedule = require('../models/Schedule');
            const activeSchedule = await Schedule.findOne({
                assignedDriver: driverId,
                status: { $in: ['Assigned', 'Accepted', 'On the way'] }
            });

            if (activeSchedule) {
                return res.status(400).json({ message: 'Driver is already assigned to an active Pickup.' });
            }
        }

        let updateData = {};
        if (!driverId) {
            updateData = { assignedDriver: null, status: 'Pending' };
        } else {
            updateData = { assignedDriver: driverId, status: 'Assigned' };
        }

        // Use findByIdAndUpdate to bypass full document validation
        const updatedComplaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedComplaint) return res.status(404).json({ message: 'Complaint not found' });

        res.json(updatedComplaint);
    } catch (error) {
        console.error('Complaint Assignment Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update complaint status
// @route   PUT /api/complaints/:id/status
// @access  Private (Driver/Admin)
router.put('/:id/status', protect, authorize('driver', 'admin'), async (req, res) => {
    const { status } = req.body;
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        // Update status logic for Drivers
        if (req.user.role === 'driver') {
            if (status === 'Assigned') {
                // complaint.assignedDriver = req.user.id; // Logic handled in updateData below if needed, but primarily status update here
            } else if (complaint.assignedDriver?.toString() !== req.user.id) {
                return res.status(401).json({ message: 'Not authorized to update this complaint' });
            }
        }

        let updateData = { status };
        if (req.user.role === 'driver' && status === 'Assigned') {
             updateData.assignedDriver = req.user.id;
        }

        const updatedComplaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.json(updatedComplaint);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
