const mongoose = require('mongoose');

const suggestionSchema = mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Please add a message'],
    },
    // Optional: Could add contact info if user wants to be contacted, 
    // but typically these are anonymous quick suggestions
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

module.exports = mongoose.model('Suggestion', suggestionSchema);
