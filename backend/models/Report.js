const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String }, // Path to uploaded image
  reportedBy: { // User who reported the issue
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: { // Cleaner to whom the report is assigned
    type: Types.ObjectId,
    ref: 'User', // Should be a user with role 'cleaner'
    default: null
  },
  assignedBy: { // Admin who assigned the report
    type: Types.ObjectId,
    ref: 'User', // Should be a user with role 'admin'
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'rejected'],
    default: 'pending'
  },
  assignedAt: { type: Date }, // When the report was assigned to a cleaner
  completedAt: { type: Date }, // When the report was marked as completed
  // user: field was redundant and removed, use reportedBy
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;