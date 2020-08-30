const mongoose = require('mongoose');

const SubscriberSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  fatherName: {
    type: String,
    required: true
  },
  subscription: {
    type: Boolean
  },
  date: {
    type: Date,
    default: Date.now
  },
  payment: [
    {
      month: String,
      year: Number,
      status: Boolean
    }
  ]
});

module.exports = Subscribers = mongoose.model('subscribers', SubscriberSchema);
