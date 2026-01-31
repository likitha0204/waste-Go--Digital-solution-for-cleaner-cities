const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wasteType: {
    type: String,
    required: true,
  },
  quantity: {
    type: String,
    required: true,
  },
  collectedWeight: {
    type: Number,
    default: 0
  },
  image: {
    type: String, // Path to uploaded image
  },
  pickupDate: {
    type: Date,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  contactNumber: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  driverSuggestions: {
    type: String,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'Accepted', 'On the way', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
