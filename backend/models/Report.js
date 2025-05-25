const mongoose = require('mongoose');
const { Schema, Types } = mongoose;
const reportSchema = new mongoose.Schema({
  title: String,
  location: String,
  description: String,
  imageUrl: String,
  reportedBy: { type: Types.ObjectId, ref: 'User' }, // User who reported the issue
  assignedTo: {type: Types.ObjectId, ref: 'User'}, // optional initially
  status: { type: String, enum: ['unassigned', 'assigned', 'in-progress', 'completed'], default: 'unassigned' },
    user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedAt: Date,
}, {timestamps: true});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;