const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'organization', 'driver', 'admin'],
    default: 'user',
  },
  contactNumber: {
    type: String,
  },
  address: {
    type: String,
  },
  vehicleType: {
    type: String,
    enum: [
      'Organic Waste Van', 
      'Recycling Truck', 
      'Hazardous Material Van', 
      'General Waste Truck', 
      'Plastic garbage Van',
      'Bio-degradable Waste Van',
      'Glass Waste Van',
      'Dry Waste Van',
      'Mixed Waste Van',
      'General Van',
      ''
    ],
    default: '',
  },
  currentLoad: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentWeightKg: {
    type: Number,
    default: 0
  },
  maxCapacityKg: {
    type: Number,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
